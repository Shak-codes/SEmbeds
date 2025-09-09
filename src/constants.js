export const EMOJIS = {
  LIKES: ":sparkling_heart:",
  RETWEETS: ":recycle:",
  REPLIES: ":speech_balloon:",
};

export const ENDPOINTS = {
  API: {
    TWITTER: "https://api.vxtwitter.com/Twitter/status/",
    DB: "https://db-embeds.fly.dev",
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
  },
};
