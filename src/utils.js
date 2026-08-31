import dotenv from "dotenv";
import deepl from "deepl-node";
import { ENDPOINTS } from "./constants.js";

dotenv.config();

const authKey = process.env.DEEPL;
const translator = new deepl.Translator(authKey);

function getMediaURLsByType(mediaList, type) {
  return mediaList.filter((media) => media.type === type).map((item) => item.url);
}

export async function req(
  url,
  { method = "GET", headers = {}, body = null } = {}
) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    return contentType && contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch (error) {
    console.error("API Request Failed:", error);
    return null;
  }
}

async function parseTweet(data) {
  const response = {
    userLink: `https://twitter.com/${data.user_screen_name}`,
    postName: "Tweet",
    postUsername: data.user_screen_name,
    postDisplayName: data.user_name,
    postLink: data.tweetURL,
    postIcon: data.user_profile_image_url,
    postText: data.text,
    postLang: data.lang,
    translated: false,
    likes: data.likes,
    retweets: data.retweets,
    replies: data.replies,
  };

  response.imageURLS = getMediaURLsByType(data.media_extended, "image");
  response.videoURLS = getMediaURLsByType(data.media_extended, "video");
  response.gifURLS = getMediaURLsByType(data.media_extended, "gif");

  if (response.postLang === "en" || isLink(response.postText)) return response;

  try {
    const translation = await translator.translateText(
      response.postText,
      null,
      "EN-US",
      {
        splitSentences: "nonewlines",
      }
    );
    const translatedText = translation.text;
    response.postText = translatedText;
    response.translated = true;
    console.log(`Translated Tweet!`);
  } catch (translationError) {
    console.error("Error translating text:", translationError);
  }
  return response;
}

const blueskyMedia = (embed) => {
  if (!embed) return [];
  const type = embed.$type ?? "";

  if (type.startsWith("app.bsky.embed.recordWithMedia")) {
    return blueskyMedia(embed.media);
  }
  if (Array.isArray(embed.images)) {
    return embed.images.map((image) => image.fullsize);
  }
  if (type.startsWith("app.bsky.embed.external")) {
    return embed.external?.thumb ? [embed.external.thumb] : [];
  }
  return [];
};

export const blueskyVideoURL = (data) => {
  const post = data?.thread?.post;
  const embed = post?.embed;
  if (!embed) return null;

  const type = embed.$type ?? "";
  const video = type.startsWith("app.bsky.embed.recordWithMedia")
    ? embed.media
    : embed;

  if (!(video?.$type ?? "").startsWith("app.bsky.embed.video")) return null;
  if (!video.cid || !post.author?.did) return null;

  const did = encodeURIComponent(post.author.did);
  return `${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.BLOB}?did=${did}&cid=${video.cid}`;
};

export const uploadLimit = (guild) => {
  const byTier = { 0: 10, 1: 10, 2: 50, 3: 100 };
  return (byTier[guild?.premiumTier] ?? 10) * 1024 * 1024;
};

async function parseBsky(data) {
  const post = data.thread.post;
  const response = {
    userLink: `https://bsky.app/profile/${post.author.handle}`,
    postName: "Post",
    postUsername: post.author.handle,
    postDisplayName: post.author.displayName || post.author.handle,
    postIcon: post.author.avatar,
    postText: post.record?.text ?? "",
    postLang: post.record?.langs?.[0] ?? null,
    translated: false,
    likes: post.likeCount ?? 0,
    retweets: (post.repostCount ?? 0) + (post.quoteCount ?? 0),
    replies: post.replyCount ?? 0,
  };

  response.imageURLS = blueskyMedia(post.embed);
  response.videoURLS = [];
  response.gifURLS = [];

  if (!response.postLang) return response;
  if (response.postLang === "en" || isLink(response.postText)) return response;

  try {
    const translation = await translator.translateText(
      response.postText,
      null,
      "EN-US",
      {
        splitSentences: "nonewlines",
      }
    );
    const translatedText = translation.text;
    response.postText = translatedText;
    response.translated = true;
    console.log(`Translated Bluesky post.`);
  } catch (translationError) {
    console.error("Error translating text:", translationError);
  }
  return response;
}

export async function compileEmbedData(
  message,
  twitterMatch,
  blueskyMatch,
  postData
) {
  const serverUser = await message.guild.members.fetch(message.author);
  let dcText = null;
  let response = null;
  if (twitterMatch) {
    dcText = message.content.replace(twitterMatch[0], "").trim();
    response = await parseTweet(postData);
  } else {
    dcText = message.content.replace(blueskyMatch[0], "").trim();
    response = await parseBsky(postData);
  }

  const embedData = {
    dcNickname: serverUser.nickname,
    dcDisplayName: message.author.displayName,
    dcIcon: serverUser.displayAvatarURL(),
    dcText,
    ...response,
  };

  console.log("Embed data...");
  console.log(embedData);

  return embedData;
}

const isLink = (text) => {
  if (!text || !text.trim()) return true;
  return text.trim().match(ENDPOINTS.REGEX.LINK) !== null;
};

export const insertPost = async (post) => {
  try {
    await fetch(`${ENDPOINTS.API.DB}/api/posts/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  } catch (err) {
    console.error("Failed to send post stats:", err);
  }
};
