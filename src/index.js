import dotenv from 'dotenv';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { req, compileEmbedData } from "./utils.js";
import { EMOJIS, ENDPOINTS } from './constants.js';

dotenv.config();

const IDENTIFIER = process.env.IDENTIFIER;
const PASSWORD = process.env.PASSWORD;
const tokenData = {
  JWT: null,
  expiry: null,
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  allowedMentions: { parse: [] },
});

async function getBlueskyJWT() {
  if (Math.floor(Date.now() / 1000) <= tokenData.expiry - 60) return;
  console.log('Grabbing JWT');
  const url = `${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.JWT}`;

  const { accessJwt } = await req(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: { identifier: IDENTIFIER, password: PASSWORD }
  });

  tokenData.JWT = accessJwt;
  tokenData.expiry = JSON.parse(atob(accessJwt.split('.')[1])).exp;

  console.log("Access JWT and expiration:", tokenData);
}

const tweetEmbed = ({
  userLink,
  dcNickname,
  dcDisplayName,
  dcIcon,
  postName,
  postUsername,
  postDisplayName,
  postLink,
  postIcon,
  postText,
  translated,
  likes,
  retweets,
  replies,
  image = null
}) =>
  new EmbedBuilder()
    .setAuthor({
      name: `${postDisplayName} (@${postUsername})`,
      url: userLink,
      iconURL: postIcon,
    })
    .setTitle(translated ? `${postName} (Translated)` : postName)
    .setURL(postLink)
    .setDescription(postText)
    .addFields({
      name: `${EMOJIS.LIKES} ${likes}    ${EMOJIS.RETWEETS} ${retweets}    ${EMOJIS.REPLIES} ${replies}`,
      value: ` `,
    })
    .setImage(image)
    .setFooter({
      text: `Posted by ${dcNickname ? `${dcNickname} (${dcDisplayName})` : dcDisplayName}`,
      iconURL: dcIcon,
    });

const imageEmbed = (tweetURL, imageURL) =>
  new EmbedBuilder().setURL(tweetURL).setImage(imageURL);

async function fetchPostData(twitterMatch, blueskyMatch) {
  if (twitterMatch && twitterMatch[3]) {
    return await req(`${ENDPOINTS.API}${twitterMatch[3]}`);
  }

  await getBlueskyJWT();
  const handle = blueskyMatch[1];
  const postid = blueskyMatch[2];
  const url = `${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.DID}${handle}`;

  const { did } = await req(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  return await req(`${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.POST}${did}/app.bsky.feed.post/${postid}`, {
    headers: {
      "Authorization": `Bearer ${tokenData.JWT}`,
      "Content-Type": "application/json"
    }
  });
}

function createImageEmbeds(tweetURL, imageURLs) {
  return imageURLs.map((imageURL) => imageEmbed(tweetURL, imageURL));
}

async function sendMediaIfAvailable(channel, URLS, logMessage) {
  console.log(logMessage);
  let mediaBatch = [];
  const largeMedia = [];
  const limit = 8 * 1024 * 1024;
  let currSize = 0;

  for (const url of URLS) {
    const size = await getMediaSize(url);
    if (currSize + size > limit && mediaBatch.length > 0) {
      await channel.send({ files: mediaBatch })
      currSize = size;
      mediaBatch = [url];
    } else if (currSize + size <= limit) {
      currSize += size;
      mediaBatch.push(url)
    } else largeMedia.push(url);
  }

  if (mediaBatch.length > 0) await channel.send({ files: mediaBatch });
  for (const media of largeMedia) await channel.send(media);
}

async function getMediaSize(url) {
  const response = await fetch(url, { method: "HEAD" });
  return parseInt(response.headers.get("content-length") || "0", 10);
}

client.on("ready", (client) => {
  console.log(`${client.user.tag} is ready!`);
  getBlueskyJWT();
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const twitterMatch = message.content.match(ENDPOINTS.REGEX.TWITTER);
  const blueskyMatch = message.content.match(ENDPOINTS.REGEX.BLUESKY);

  if (!(twitterMatch || blueskyMatch)) return;

  const postData = await fetchPostData(twitterMatch, blueskyMatch);
  const embedData = await compileEmbedData(message, twitterMatch, blueskyMatch, postData);
  if (blueskyMatch) embedData.postLink = blueskyMatch[0];
  if (twitterMatch) embedData.image = embedData.imageURLS[0];

  console.log(`embedData:`);
  console.log(embedData);

  const mainEmbed = tweetEmbed(embedData);

  console.log("Main embed created!");

  const imageEmbeds = createImageEmbeds(embedData.postLink, embedData.imageURLS.slice(1));

  if (embedData.dcText.length > 0) {
    message.suppressEmbeds(true);
    await message.reply({ embeds: [mainEmbed, ...imageEmbeds], repliedUser: false });
  } else {
    message.delete();
    await message.channel.send({ embeds: [mainEmbed, ...imageEmbeds] });
  }

  await sendMediaIfAvailable(
    message.channel,
    embedData.videoURLS,
    "Getting video data via API call to"
  );
  await sendMediaIfAvailable(
    message.channel,
    embedData.gifURLS,
    "Getting gif data via API call to"
  );
});

client.login(process.env.TOKEN);
