import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { ENDPOINTS } from "./constants.js";


export const PAGE_PREFIX = "wrapped";

const COLOR = "#1DA1F2";
const HIGHLIGHT = "#F5A623";
const MEDAL = ["🥇", "🥈", "🥉", "4.", "5."];

export const fetchYears = async () => {
  const url = `${ENDPOINTS.API.DB}${ENDPOINTS.API.WRAPPED}years`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Year lookup failed: ${response.status}`);
  const { years } = await response.json();
  return years ?? [];
};

export const selectableYears = (years, now = new Date()) => {
  const current = now.getUTCFullYear();
  const finalWeek = now.getUTCMonth() === 11 && now.getUTCDate() >= 25;

  return years
    .filter((year) => year < current || finalWeek)
    .sort((a, b) => b - a);
};

export const fetchWrapped = async (year, userId, serverId) => {
  const query = new URLSearchParams({ userId });
  if (serverId) query.set("serverId", serverId);
  const url = `${ENDPOINTS.API.DB}${ENDPOINTS.API.WRAPPED}${year}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wrapped lookup failed: ${response.status}`);
  return response.json();
};

const place = (rank, outOf) => (rank ? `#${rank} of ${outOf}` : "unranked");

const resolveUser = async (client, id) => {
  try {
    const user = await client.users.fetch(id);
    return { name: user.displayName ?? user.username, icon: user.displayAvatarURL() };
  } catch {
    return { name: `Unknown user (${id})`, icon: null };
  }
};

const resolveServer = (client, id) => {
  const guild = client.guilds.cache.get(id);
  if (!guild) return { name: "A server SEmbeds has left", icon: null };
  return { name: guild.name, icon: guild.iconURL() };
};

const leaderboard = (entries) => {
  if (entries.length === 0) {
    return [new EmbedBuilder().setColor(COLOR).setDescription("Nothing here yet.")];
  }

  return entries.map((entry, i) =>
    new EmbedBuilder().setColor(entry.highlight ? HIGHLIGHT : COLOR).setAuthor({
      name: `${entry.medal ?? MEDAL[i]}  ${entry.name}  ${entry.value}`,
      iconURL: entry.icon ?? undefined,
    })
  );
};

const youPage = async (client, data) => {
  const { year, user } = data;
  const me = await resolveUser(client, user.userId);

  const heading = `${me.name}'s SEmbeds Wrapped`;
  const embed = new EmbedBuilder().setColor(COLOR).setThumbnail(me.icon);

  if (!user.found) {
    return {
      heading,
      embeds: [
        embed.setDescription(
          `You did not post anything SEmbeds picked up in ${year}. Page through for how everyone else did.`
        ),
      ],
    };
  }

  const s = user.stats;
  return {
    heading,
    embeds: [
      embed
        .setDescription(
          `**${s.posts} posts**, ranked **${place(user.ranks.posts, user.outOf.posts)}** overall`
        )
        .addFields(
          {
            name: "Twitter",
            value: `**${s.twitter}**`,
            inline: true,
          },
          {
            name: "Bluesky",
            value: `**${s.bluesky}**`,
            inline: true,
          },
          {
            name: "Longest daily streak",
            value: `**${user.maxStreak}** ${user.maxStreak === 1 ? "day" : "days"}`,
            inline: true,
          }
        ),
    ],
  };
};

const mediaPage = async (client, data) => {
  const { year, user } = data;
  const me = await resolveUser(client, user.userId);

  const heading = `What you shared in ${year}`;
  const embed = new EmbedBuilder().setColor(COLOR);

  if (!user.found) {
    return {
      heading,
      embeds: [embed.setDescription("Nothing to show for this one.")],
    };
  }

  const s = user.stats;
  const line = (emoji, count, label, rank, outOf) =>
    `${emoji}  **${count}** ${label}${count === 1 ? "" : "s"}  ·  ${place(rank, outOf)}`;

  return {
    heading,
    embeds: [
      embed.setDescription(
        [
          line("🖼️", s.images, "image", user.ranks.images, user.outOf.images),
          line("🎬", s.videos, "video", user.ranks.videos, user.outOf.videos),
          line("✨", s.gifs, "gif", user.ranks.gifs, user.outOf.gifs),
          `🌅  **${s.firsts}** first post${s.firsts === 1 ? "" : "s"} of the day  ·  ${place(user.ranks.firsts, user.outOf.firsts)}`,
        ].join("\n\n")
      ),
    ],
  };
};

const postersPage = async (client, data) => {
  const entries = await Promise.all(
    data.topPosters.map(async (entry) => ({
      ...(await resolveUser(client, entry.userId)),
      value: `- ${entry.posts} posts`,
    }))
  );
  return { heading: `Top posters of ${data.year}`, embeds: leaderboard(entries) };
};

const serversPage = async (client, data) => {
  const entries = data.topServers.map((entry) => ({
    ...resolveServer(client, entry.serverId),
    value: `- ${entry.posts} posts`,
  }));

  const here = data.server;
  const alreadyListed =
    here?.found &&
    data.topServers.some((entry) => entry.serverId === here.serverId);

  if (here?.found && !alreadyListed) {
    entries.push({
      ...resolveServer(client, here.serverId),
      medal: `#${here.rank}`,
      value: `- ${here.posts} posts  ·  this server`,
      highlight: true,
    });
  }

  return { heading: `Top servers of ${data.year}`, embeds: leaderboard(entries) };
};

const streaksPage = async (client, data) => {
  const entries = await Promise.all(
    data.topStreaks.map(async (entry) => ({
      ...(await resolveUser(client, entry.userId)),
      value: `- ${entry.maxStreak} day streak`,
    }))
  );
  return { heading: `Longest streaks of ${data.year}`, embeds: leaderboard(entries) };
};

const PAGES = [
  { label: "You", build: youPage },
  { label: "Media", build: mediaPage },
  { label: "Posters", build: postersPage },
  { label: "Servers", build: serversPage },
  { label: "Streaks", build: streaksPage },
];

export const PAGE_COUNT = PAGES.length;

const controls = (year, page, ownerId) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PAGE_PREFIX}:${year}:${page - 1}:${ownerId}`)
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("wrapped-indicator")
      .setLabel(`${PAGES[page].label}  ${page + 1}/${PAGE_COUNT}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${PAGE_PREFIX}:${year}:${page + 1}:${ownerId}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === PAGE_COUNT - 1)
  );

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const timeframe = (year) => {
  const now = new Date();
  const end =
    year === now.getUTCFullYear()
      ? now
      : new Date(Date.UTC(year, 11, 31));
  return `Jan 1 to ${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}, ${year}`;
};

export const buildPage = async (client, data, page) => {
  const index = Math.min(Math.max(page, 0), PAGE_COUNT - 1);
  const { heading, embeds } = await PAGES[index].build(client, data);

  embeds[embeds.length - 1].setFooter({
    text: `${timeframe(data.year)}  ·  ${data.totals.posts} posts from ${data.totals.posters} people across ${data.totals.servers} servers`,
  });

  return {
    content: `## ${heading}`,
    embeds,
    components: [controls(data.year, index, data.user?.userId ?? "")],
  };
};
