module.exports = {
  EMOJIS: {
    LIKES: ":sparkling_heart:",
    RETWEETS: ":recycle:",
    REPLIES: ":speech_balloon:"
  },

  ENDPOINTS: {
    API: "https://api.vxtwitter.com/Twitter/status/",
    BASE: {
      TWITTER: "https://twitter.com/",
      BLUESKY: "https://bsky.social/xrpc/"
    },
    REGEX: {
      TWITTER: /https:\/\/(x|twitter).com\/\w{1,15}\/(status|statuses)\/(\d{2,20})(\S*)/,
      BLUESKY: /https:\/\/bsky\.app\/profile\/[a-zA-Z0-9_-]+\/post\/[a-zA-Z0-9_-]+/
    },
    BLUESKY: {
      JWT: "com.atproto.server.createSession",
      POST: "app.bsky.feed.getPostThread?uri=at://did:",
      DID: "com.atproto.identity.resolveHandle?handle="
    }
  }
};
