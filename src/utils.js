import dotenv from 'dotenv';
import deepl from 'deepl-node';

dotenv.config();

const authKey = process.env.DEEPL;
const translator = new deepl.Translator(authKey);

function getMediaURLsByType(mediaList, type) {
  return mediaList
    .filter((media) => media.type === type)
    .map((item) => item.url);
}

export async function req(url, { method = "GET", headers = {}, body = null } = {}) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
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

  if (response.twLang === "en") return response;

  try {
    const translation = await translator.translateText(response.postText, null, 'EN-US', {
      splitSentences: 'nonewlines',
    });
    const translatedText = translation.text;
    response.postText = translatedText;
    response.translated = true;
    console.log(`Translated Tweet: ${translatedText}`);
  } catch (translationError) {
    console.error('Error translating text:', translationError);
  }
  return response;
}

async function parseBsky(data) {
  const post = data.thread.post;
  const response = {
    postUsername: post.author.handle,
    postDisplayName: post.author.displayName,
    postIcon: post.author.avatar,
    postText: post.record.text,
    postLang: post.record.langs[0],
    translated: false,
    likes: post.likeCount,
    retweets: post.repostCount + post.quoteCount,
    replies: post.replyCount,
  }
    //   const imageURLS = getMediaURLsByType(data.media_extended, "image");
    //   const videoURLS = getMediaURLsByType(data.media_extended, "video");
    //   const gifURLS = getMediaURLsByType(data.media_extended, "gif");

  if (response.postLang === "en") return response;

  try {
    const translation = await translator.translateText(response.postText, null, 'EN-US', {
      splitSentences: 'nonewlines',
    });
    const translatedText = translation.text;
    response.postText = translatedText;
    response.translated = true;
    console.log(`Translated Tweet: ${translatedText}`);
  } catch (translationError) {
    console.error('Error translating text:', translationError);
  }
  return response;
}

export async function compileEmbedData(message, twitterMatch, blueskyMatch, postData) {
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

  return { 
    dcNickname: serverUser.nickname,
    dcDisplayName: message.author.displayName,
    dcIcon: serverUser.displayAvatarURL(),
    dcText,
    ...response  
  }
}