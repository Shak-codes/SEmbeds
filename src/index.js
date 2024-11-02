require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const deepl = require('deepl-node');

const authKey = process.env.DEEPL;
const translator = new deepl.Translator(authKey);

const config = require("./constants");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  allowedMentions: { parse: [] },
});

client.on("ready", (client) => {
  console.log(`${client.user.tag} is ready!`);
});

const tweetEmbed = (
  data,
  tweetContent,
  translated,
  linkPosterUsername,
  linkPosterIconURL,
  image
) =>
  new EmbedBuilder()
    .setColor(0x0099ff)
    .setAuthor({
      name: `${data.user_name} (@${data.user_screen_name})`,
      url: `${config.ENDPOINTS.BASE.TWITTER}${data.user_screen_name}`,
      iconURL: data.user_profile_image_url,
    })
    .setTitle(translated ? 'Tweet (Translated)' : 'Tweet')
    .setURL(data.tweetURL)
    .setDescription(tweetContent)
    .addFields({
      name: `${config.EMOJIS.LIKES} ${data.likes}    ${config.EMOJIS.RETWEETS} ${data.retweets}    ${config.EMOJIS.REPLIES} ${data.replies}`,
      value: ` `,
    })
    .setImage(image)
    .setFooter({
      text: `Posted by ${linkPosterUsername}`,
      iconURL: linkPosterIconURL,
    });

const imageEmbed = (tweetURL, imageURL) =>
  new EmbedBuilder().setURL(tweetURL).setImage(imageURL);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const serverUser = await getServerUser(message);
  const { nickname, avatar } = getNicknameAndAvatar(serverUser);

  const matches = message.content.match(config.ENDPOINTS.REGEX.TWITTER);
  if (!(matches && matches[3])) return;
  
  if (matches && matches[3]) {
    console.log(`Tweet ID: ${matches[3]}`);
    const data = await fetchData(matches[3]);

    if (!data) return;
    console.log("Tweet data obtained");

    const { text, translated, imageURLS, videoURLS, gifURLS } =
      await processTweetData(data);

    const linkPosterContent = message.content.replace(matches[0], "").trim();
    console.log(`Discord message content: ${linkPosterContent}`);
    console.log(`Tweet text: ${text}`);
    console.log(`Tweet images`);
    console.table(imageURLS);
    console.log(`Tweet videos`);
    console.table(videoURLS);
    console.log(`Tweet gifs`);
    console.table(gifURLS);

    const mainEmbed = createMainTweetEmbed(
      message,
      data,
      nickname,
      avatar,
      text,
      translated,
      imageURLS[0]
    );

    console.log("Main embed created!");

    const imageEmbeds = createImageEmbeds(data.tweetURL, imageURLS.slice(1));

    if (linkPosterContent.length > 0) {
      message.suppressEmbeds(true);
      await message.reply({ embeds: [mainEmbed, ...imageEmbeds], repliedUser: false });
    } else {
      message.delete();
      await message.channel.send({ embeds: [mainEmbed, ...imageEmbeds] });
    }

    await sendMediaIfAvailable(
      message.channel,
      videoURLS,
      "Getting video data via API call to"
    );
    await sendMediaIfAvailable(
      message.channel,
      gifURLS,
      "Getting gif data via API call to"
    );
  }
});

async function getServerUser(message) {
  return await message.guild.members.fetch(message.author);
}

function getNicknameAndAvatar(serverUser) {
  const nickname = serverUser.nickname;
  const avatar = serverUser.displayAvatarURL();
  return { nickname, avatar };
}

async function fetchData(tweetID) {
  const response = await fetch(`${config.ENDPOINTS.API}${tweetID}`);
  return response.status >= 400 ? null : await response.json();
}

async function processTweetData(data) {
  const { text, lang } = data;
  const translated = lang === "en" ? false : true;

  const imageURLS = getMediaURLsByType(data.media_extended, "image");
  const videoURLS = getMediaURLsByType(data.media_extended, "video");
  const gifURLS = getMediaURLsByType(data.media_extended, "gif");

  const response = { text, translated, imageURLS, videoURLS, gifURLS };

  if (!translated) return response;

  try {
    const translation = await translator.translateText(text, null, 'EN-US', {
      splitSentences: 'nonewlines',
    });
    const translatedText = translation.text;
    response.text = translatedText;
    console.log(`Translated tweetContent: ${translatedText}`);
  } catch (translationError) {
    console.error('Error translating text:', translationError);
    response.translated = false;
  }
  return response;
}


function getMediaURLsByType(mediaList, type) {
  return mediaList
    .filter((media) => media.type === type)
    .map((item) => item.url);
}

function createMainTweetEmbed(
  message,
  data,
  nickname,
  avatar,
  text,
  translated,
  imageURL
) {
  return tweetEmbed(
    data,
    text,
    translated,
    nickname
      ? `${nickname} (${message.author.displayName})`
      : message.author.displayName,
    avatar,
    imageURL
  );
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

client.login(process.env.TOKEN);
