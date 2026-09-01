import dotenv from "dotenv";

dotenv.config();

export const EMOJIS = {
  LIKES: ":sparkling_heart:",
  RETWEETS: ":recycle:",
  REPLIES: ":speech_balloon:",
};

export const ENDPOINTS = {
  API: {
    TWITTER: "https://api.vxtwitter.com/Twitter/status/",
    DB: process.env.DB_URL ?? "https://db-embeds.fly.dev",
    WRAPPED: "/api/wrapped/",
  },
  BASE: {
    TWITTER: "https://twitter.com/",
    BLUESKY: "https://bsky.social/xrpc/",
  },
  REGEX: {
    TWITTER:
      /https:\/\/(x|twitter).com\/\w{1,15}\/(status|statuses)\/(\d{2,20})(\S*)/,
    BLUESKY: /https:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/]+)/,
    LINK: /^\s*<?(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\S*>?\s*$/i,
  },
  BLUESKY: {
    JWT: "com.atproto.server.createSession",
    POST: "app.bsky.feed.getPostThread?uri=at://",
    DID: "com.atproto.identity.resolveHandle?handle=",
    BLOB: "com.atproto.sync.getBlob",
  },
};

export const IMPERSONATION = {
  WEBHOOK_NAME: "S-Embeds",
  MAX_CONTENT: 2000,
  MAX_USERNAME: 80,
  DELETE_EMOJI: "❌",
  OWNERSHIP_TTL_MS: 24 * 60 * 60 * 1000,
};

export const DISCORD_ERRORS = {
  UNKNOWN_WEBHOOK: 10015,
  MAX_WEBHOOKS: 30007,
};
