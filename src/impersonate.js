import { getWebhook, invalidate, resolveTarget, safeError } from "./webhookManager.js";
import { IMPERSONATION, DISCORD_ERRORS } from "./constants.js";

// Webhook rate limits are per channel and shared across every webhook in it, so
// extra webhooks buy no throughput. Serialising keeps reposts in order.
const channelChains = new Map();

function enqueue(key, task) {
  const previous = channelChains.get(key) ?? Promise.resolve();
  const result = previous.then(task, task);

  const tail = result.catch(() => {});
  channelChains.set(key, tail);
  tail.then(() => {
    if (channelChains.get(key) === tail) channelChains.delete(key);
  });

  return result;
}

// Discord rejects webhook usernames containing "discord" or "clyde".
export function sanitiseUsername(raw) {
  let name = (raw ?? "")
    .replace(/discord/gi, "d1scord")
    .replace(/clyde/gi, "c1yde")
    .replace(/[`\u0000-\u001f]/g, "")
    .trim();

  if (name.length > IMPERSONATION.MAX_USERNAME) {
    name = name.slice(0, IMPERSONATION.MAX_USERNAME).trim();
  }
  return name.length > 0 ? name : "Unknown User";
}

async function deliver(channel, payload, isRetry = false) {
  const target = await getWebhook(channel);
  if (!target) return null;

  try {
    return await target.webhook.send({
      ...payload,
      threadId: target.threadId,
      // Mandatory, and applied last so a caller cannot override it. A webhook
      // send does not check the original author's permissions, so without this
      // any member could push @everyone through the bot.
      allowedMentions: { parse: ["users"] },
    });
  } catch (err) {
    if (err?.code === DISCORD_ERRORS.UNKNOWN_WEBHOOK && !isRetry) {
      invalidate(channel);
      return deliver(channel, payload, true);
    }
    console.error("Impersonated send failed:", safeError(err));
    return null;
  }
}

export function sendAsUser(channel, payload) {
  const { parent } = resolveTarget(channel);
  return enqueue(parent?.id ?? channel.id, () => deliver(channel, payload));
}
