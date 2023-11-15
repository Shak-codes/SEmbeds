require("dotenv").config();

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
import { ICONS, URLS, REGEX } from "./constants";

const tweetEmbed = (
  opUsername,
  opTag,
  opPFP,
  tweetURL,
  tweetContent,
  tweetLikes,
  tweetRetweets,
  tweetReplies,
  rUsername,
  rPFP,
  rContent,
  image
) => {
  const authorName = `${opUsername} (@${opTag})`;
  const authorURL = `${URLS.TWITTER}${opTag}`;
  const likes = `${ICONS.LIKES} ${tweetLikes}    `;
  const retweets = `${ICONS.RETWEETS} ${tweetRetweets}    `;
  const replies = `${ICONS.REPLIES} ${tweetReplies}`;
  const footerContent = `Posted by ${rUsername} ${
    rContent.length > 0 ? `- "${rContent}"` : ""
  }`;
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setAuthor({ name: authorName, url: authorURL, iconURL: opPFP })
    .setTitle("Tweet")
    .setURL(tweetURL)
    .setDescription(tweetContent)
    .addFields({ name: `${likes}${retweets}${replies}`, value: ` ` })
    .setImage(image)
    .setFooter({ text: footerContent, iconURL: rPFP });

  return embed;
};

const imageEmbed = (tweetURL, imageURL) => {
  const embed = new EmbedBuilder().setURL(tweetURL).setImage(imageURL);
  return embed;
};

client.on("ready", (client) => {
  console.log(`${client.user.tag} is ready!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return false;

  const serverUser = await message.guild.members.fetch(message.author);
  const nickname = serverUser.nickname;
  const avatar = serverUser.displayAvatarURL();
  matches = message.content.match(REGEX);

  if (matches && matches[3]) {
    const response = await fetch(`${URL}${matches[3]}`);
    if (response.status >= 400) return false;

    message.delete();

    const data = await response.json();
    const content = message.content.replace(matches[0], "").trim();
    const videoURLS = data.media_extended
      .filter((media) => media.type == "video")
      .map((video) => video.url);
    const imageURLS = data.media_extended
      .filter((media) => media.type == "image")
      .map((image) => image.url);
    const gifURLS = data.media_extended
      .filter((media) => media.type == "gif")
      .map((gif) => gif.url);

    const mainEmbed = tweetEmbed(
      data.user_name,
      data.user_screen_name,
      data.user_profile_image_url,
      data.tweetURL,
      data.text,
      data.likes,
      data.retweets,
      data.replies,
      nickname
        ? `${nickname} (${message.author.displayName})`
        : message.author.displayName,
      avatar,
      content,
      imageURLS[0]
    );

    const imageEmbeds = imageURLS
      .slice(1)
      .map((imageURL) =>
        imageEmbed(`https://twitter.com/${data.user_screen_name}`, imageURL)
      );

    await message.channel.send({ embeds: [mainEmbed, ...imageEmbeds] });
    if (videoURLS.length > 0) await message.channel.send({ files: videoURLS });
    if (gifURLS.length > 0) await message.channel.send({ files: gifURLS });
  }
});

client.login(process.env.TOKEN);
