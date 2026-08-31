import { IMPERSONATION, DISCORD_ERRORS } from "./constants.js";

// `username`/`avatarURL` are per-message fields, so one webhook per channel
// impersonates every member. Never create one per user.
const webhookCache = new Map();

// DiscordAPIError keeps the execute URL, which carries the token in its path.
// Logging the raw error would leak a credential.
const TOKEN_IN_URL = /(\/webhooks\/\d+\/)[\w-]+/g;

export const redact = (value) =>
  typeof value === "string" ? value.replace(TOKEN_IN_URL, "$1[redacted]") : value;

export const safeError = (err) => ({
  code: err?.code,
  status: err?.status,
  message: redact(err?.message ?? String(err)),
});

// Threads and forum posts cannot own webhooks; the parent does.
export function resolveTarget(channel) {
  if (channel?.isThread?.()) {
    return { parent: channel.parent ?? null, threadId: channel.id };
  }
  return { parent: channel ?? null, threadId: undefined };
}

export async function getWebhook(channel) {
  const { parent, threadId } = resolveTarget(channel);
  if (!parent) return null;

  const cached = webhookCache.get(parent.id);
  if (cached) return { webhook: cached, threadId };

  const me = parent.client.user;

  try {
    const hooks = await parent.fetchWebhooks();
    let webhook = hooks.find((w) => w.owner?.id === me.id && w.token);

    if (!webhook) {
      webhook = await parent.createWebhook({
        name: IMPERSONATION.WEBHOOK_NAME,
        avatar: me.displayAvatarURL(),
        reason: "S-Embeds link fixing",
      });
    }

    webhookCache.set(parent.id, webhook);
    return { webhook, threadId };
  } catch (err) {
    if (err?.code === DISCORD_ERRORS.MAX_WEBHOOKS) {
      console.warn(
        `Channel ${parent.id} is at the webhook cap; skipping impersonation.`
      );
      return null;
    }
    console.error("Failed to resolve webhook:", safeError(err));
    return null;
  }
}

export function invalidate(channel) {
  const { parent } = resolveTarget(channel);
  if (parent) webhookCache.delete(parent.id);
}
