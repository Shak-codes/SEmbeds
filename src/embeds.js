import { EmbedBuilder } from "discord.js";
import { EMOJIS } from "./constants.js";

export const tweetEmbed = ({
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
  image = null,
  attribute = true,
}) => {
  const embed = new EmbedBuilder()
    .setColor(`${postName === "Tweet" ? "#000000" : "#1DA1F2"}`)
    .setAuthor({
      name: `${postDisplayName} (@${postUsername}) on ${
        postName === "Tweet" ? "X" : "Bluesky"
      }`,
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
    .setImage(image);

  if (attribute) {
    embed.setFooter({
      text: `Posted by ${
        dcNickname ? `${dcNickname} (${dcDisplayName})` : dcDisplayName
      }`,
      iconURL: dcIcon,
    });
  }

  return embed;
};

export const imageEmbed = (tweetURL, imageURL) =>
  new EmbedBuilder().setURL(tweetURL).setImage(imageURL);

export const createImageEmbeds = (tweetURL, imageURLs) =>
  imageURLs.map((imageURL) => imageEmbed(tweetURL, imageURL));
