require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const {
  LIKES,
  RETWEETS,
  REPLIES,
  API,
  TWITTER,
  REGEX,
} = require("./constants");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

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
  const authorURL = `${TWITTER}${opTag}`;
  const likes = `${LIKES} ${tweetLikes}    `;
  const retweets = `${RETWEETS} ${tweetRetweets}    `;
  const replies = `${REPLIES} ${tweetReplies}`;
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
    const response = await fetch(`${API}${matches[3]}`);
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
        imageEmbed(`${CONST.TWITTER}${data.user_screen_name}`, imageURL)
      );

    await message.channel.send({ embeds: [mainEmbed, ...imageEmbeds] });
    if (videoURLS.length > 0) {
      const response = await fetch(videoURLS[0], { method: "HEAD" });
      size = parseInt(
        Object.fromEntries(response.headers.entries())["content-length"]
      );
      await message.channel.send(
        size > 8000000 ? videoURLS[0] : { files: videoURLS }
      );
    }
    if (gifURLS.length > 0) {
      const response = await fetch(videoURLS[0], { method: "HEAD" });
      size = parseInt(
        Object.fromEntries(response.headers.entries())["content-length"]
      );
      await message.channel.send(
        size > 8000000 ? gifURLS[0] : { files: gifURLS }
      );
    }
  }
});

client.login(process.env.TOKEN);
