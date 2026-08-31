import dotenv from "dotenv";
import { req } from "./utils.js";
import { ENDPOINTS, IMPERSONATION } from "./constants.js";

dotenv.config();

const IDENTIFIER = process.env.IDENTIFIER;
const PASSWORD = process.env.PASSWORD;

const tokenData = {
  JWT: null,
  expiry: null,
};

const getBlueskyJWT = async () => {
  if (Math.floor(Date.now() / 1000) <= tokenData.expiry - 60) return;
  console.log("Grabbing JWT");
  const url = `${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.JWT}`;

  const { accessJwt } = await req(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { identifier: IDENTIFIER, password: PASSWORD },
  });

  tokenData.JWT = accessJwt;
  tokenData.expiry = JSON.parse(atob(accessJwt.split(".")[1])).exp;

  console.log("JWT successfully obtained");
};

export const fetchPostData = async (twitterMatch, blueskyMatch) => {
  if (twitterMatch && twitterMatch[3]) {
    return await req(`${ENDPOINTS.API.TWITTER}${twitterMatch[3]}`);
  }

  await getBlueskyJWT();
  const handle = blueskyMatch[1];
  const postid = blueskyMatch[2];
  const url = `${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.DID}${handle}`;

  const { did } = await req(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await req(
    `${ENDPOINTS.BASE.BLUESKY}${ENDPOINTS.BLUESKY.POST}${did}/app.bsky.feed.post/${postid}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.JWT}`,
        "Content-Type": "application/json",
      },
    }
  );
};

const getMediaSize = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return parseInt(response.headers.get("content-length") || "0", 10);
  } catch (err) {
    console.error("Failed to size media:", err.message);
    return 0;
  }
};

export async function planMediaBatches(urls) {
  const batches = [];
  const oversize = [];
  let batch = [];
  let size = 0;

  for (const url of urls) {
    const mediaSize = await getMediaSize(url);

    if (size + mediaSize > IMPERSONATION.MAX_ATTACHMENT_BYTES && batch.length > 0) {
      batches.push(batch);
      batch = [url];
      size = mediaSize;
    } else if (size + mediaSize <= IMPERSONATION.MAX_ATTACHMENT_BYTES) {
      size += mediaSize;
      batch.push(url);
    } else {
      oversize.push(url);
    }
  }

  if (batch.length > 0) batches.push(batch);
  return { batches, oversize };
}
