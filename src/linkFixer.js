import { PermissionFlagsBits } from "discord.js";
import {
  compileEmbedData,
  insertPost,
  blueskyVideoURL,
  uploadLimit,
} from "./utils.js";
import { tweetEmbed, createImageEmbeds } from "./embeds.js";
import { fetchPostData, planMediaBatches } from "./posts.js";
import { sendAsUser, sanitiseUsername } from "./impersonate.js";
import { resolveTarget, safeError } from "./webhookManager.js";
import { remember, ownedBy, forget } from "./ownership.js";
import { ENDPOINTS, IMPERSONATION } from "./constants.js";

// <link> is how a user opts out of embeds. Blank those spans before matching so
// the opt-out survives; equal-length spaces keep surrounding text apart.
const ANGLE_WRAPPED = /<[^\s<>]+>/g;

const withoutSuppressed = (content) =>
  content.replace(ANGLE_WRAPPED, (span) => " ".repeat(span.length));

const canImpersonate = (message) => {
  const { parent } = resolveTarget(message.channel);
  if (!parent) return false;

  const me = message.guild.members.me;
  if (!me) return false;

  const here = me.permissionsIn(message.channel);
  const onParent = me.permissionsIn(parent);

  return (
    here.has(PermissionFlagsBits.ManageMessages) &&
    here.has(PermissionFlagsBits.SendMessages) &&
    onParent.has(PermissionFlagsBits.ManageWebhooks)
  );
};

// Webhooks cannot reply, so a reply becomes a subtext jump link instead.
const replyPrefix = async (message) => {
  if (!message.reference?.messageId) return "";
  try {
    const ref = await message.fetchReference();
    const url = `https://discord.com/channels/${message.guildId}/${message.channelId}/${ref.id}`;
    const name = ref.author.displayName.replace(/([[\]])/g, "\\$1");
    return `-# [↪ replying to ${name}](${url})\n`;
  } catch {
    return "";
  }
};

// Null means too large to carry across, so the fix is abandoned rather than
// silently dropping the user's files.
const collectAttachments = (message, limit) => {
  if (message.attachments.size === 0) return [];

  const total = message.attachments.reduce(
    (sum, attachment) => sum + (attachment.size ?? 0),
    0
  );
  if (total >= limit) return null;

  return [...message.attachments.values()].map((attachment) => attachment.url);
};

const identityOf = (message) => ({
  username: sanitiseUsername(
    message.member?.displayName ?? message.author.displayName
  ),
  avatarURL: (message.member ?? message.author).displayAvatarURL(),
});

// Send before deleting, so a failure costs the fix rather than the message.
async function impersonate(message, { content, embeds = [], files = [] }) {
  if (content.length > IMPERSONATION.MAX_CONTENT) {
    console.warn("Rewritten body exceeds the content limit; leaving message be.");
    return null;
  }

  const identity = identityOf(message);
  const posted = await sendAsUser(message.channel, {
    ...identity,
    content: content.length > 0 ? content : undefined,
    embeds,
    files,
  });

  if (!posted) return null;

  remember(posted.id, message.author.id);

  try {
    await message.delete();
  } catch (err) {
    console.error("Reposted but could not delete the original:", safeError(err));
  }

  return { posted, identity };
}

async function handleRichEmbed(message, twitterMatch, blueskyMatch) {
  const stats = {
    type: twitterMatch ? "Twitter" : "Bluesky",
    serverId: message.guildId,
    timestamp: message.createdAt,
    userId: message.author.id,
  };

  console.log(
    `Recognized a tweet/post in ${message.guild.name}'s "${message.channel.name}" chat.`
  );

  const postData = await fetchPostData(twitterMatch, blueskyMatch);
  if (!postData) {
    console.warn("Post lookup returned nothing; leaving the message alone.");
    return;
  }

  const limit = uploadLimit(message.guild);
  const blueskyVideo = blueskyMatch ? blueskyVideoURL(postData) : null;

  const embedData = await compileEmbedData(
    message,
    twitterMatch,
    blueskyMatch,
    postData
  );
  if (blueskyMatch) embedData.postLink = blueskyMatch[0];
  if (blueskyVideo) embedData.videoURLS = [blueskyVideo];
  embedData.image = embedData.imageURLS[0];

  stats.imageCount = embedData.imageURLS.length;
  stats.gifCount = embedData.gifURLS.length;
  stats.videoCount = embedData.videoURLS.length;

  const imageEmbeds = createImageEmbeds(
    embedData.postLink,
    embedData.imageURLS.slice(1)
  );

  const impersonating = canImpersonate(message);
  const embeds = [
    tweetEmbed({ ...embedData, attribute: !impersonating }),
    ...imageEmbeds,
  ];

  console.log("Main embed created successfully!");

  const delivered = impersonating
    ? await deliverAsAuthor(message, embedData, embeds, limit)
    : null;

  if (!delivered) await deliverAsBot(message, embedData, embeds, limit);

  console.log("Post details...", stats);
  console.log(await insertPost(stats));
}

async function deliverAsAuthor(message, embedData, embeds, limit) {
  const files = collectAttachments(message, limit);
  if (files === null) {
    console.warn("Attachments exceed the upload ceiling; skipping impersonation.");
    return null;
  }

  const content = `${await replyPrefix(message)}${embedData.dcText}`.trim();
  const result = await impersonate(message, { content, embeds, files });
  if (!result) return null;

  await sendMedia(
    message,
    result.identity,
    [...embedData.videoURLS, ...embedData.gifURLS],
    limit
  );

  return result;
}

async function deliverAsBot(message, embedData, embeds, limit) {
  if (embedData.dcText.length > 0) {
    await message.suppressEmbeds(true);
    await message.reply({ embeds, repliedUser: false });
  } else {
    await message.delete().catch(() => {});
    await message.channel.send({ embeds });
  }

  for (const urls of [embedData.videoURLS, embedData.gifURLS]) {
    if (urls.length === 0) continue;
    const { batches, oversize } = await planMediaBatches(urls, limit);
    for (const batch of batches) await message.channel.send({ files: batch });
    for (const url of oversize) await message.channel.send(url);
  }
}

async function sendMedia(message, identity, urls, limit) {
  if (urls.length === 0) return;

  const { batches, oversize } = await planMediaBatches(urls, limit);

  for (const batch of batches) {
    const sent = await sendAsUser(message.channel, { ...identity, files: batch });
    if (sent) remember(sent.id, message.author.id);
  }
  for (const url of oversize) {
    const sent = await sendAsUser(message.channel, { ...identity, content: url });
    if (sent) remember(sent.id, message.author.id);
  }
}

export async function handleMessageCreate(message) {
  if (!message.guild) return;
  if (message.author.bot) return;
  // Stops the bot reacting to its own reposts forever.
  if (message.webhookId) return;
  if (!message.content) return;
  if (message.stickers?.size > 0) return;
  if (message.poll) return;

  const visible = withoutSuppressed(message.content);
  const twitterMatch = visible.match(ENDPOINTS.REGEX.TWITTER);
  const blueskyMatch = visible.match(ENDPOINTS.REGEX.BLUESKY);
  if (!(twitterMatch || blueskyMatch)) return;

  try {
    await handleRichEmbed(message, twitterMatch, blueskyMatch);
  } catch (err) {
    console.error("Link fix failed:", safeError(err));
  }
}

export async function handleReactionAdd(reaction, user) {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch (err) {
    console.error("Could not resolve reaction:", safeError(err));
    return;
  }

  if (reaction.emoji.name !== IMPERSONATION.DELETE_EMOJI) return;

  const { message } = reaction;
  if (!message.webhookId) return;
  if (!ownedBy(message.id, user.id)) return;

  try {
    await message.delete();
    forget(message.id);
  } catch (err) {
    console.error("Could not remove reposted message:", safeError(err));
  }
}
