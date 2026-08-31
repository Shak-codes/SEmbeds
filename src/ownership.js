import { IMPERSONATION } from "./constants.js";

// Backs the ❌ affordance, since the user can no longer delete "their own" repost.
// A restart forfeits it, until this moves to Postgres/Supabase.
const owners = new Map();

const sweep = () => {
  const now = Date.now();
  for (const [messageId, record] of owners) {
    if (record.expiresAt <= now) owners.delete(messageId);
  }
};

export function remember(messageId, authorId) {
  if (!messageId || !authorId) return;
  sweep();
  owners.set(messageId, {
    authorId,
    expiresAt: Date.now() + IMPERSONATION.OWNERSHIP_TTL_MS,
  });
}

export function ownedBy(messageId, userId) {
  const record = owners.get(messageId);
  if (!record) return false;
  if (record.expiresAt <= Date.now()) {
    owners.delete(messageId);
    return false;
  }
  return record.authorId === userId;
}

export function forget(messageId) {
  owners.delete(messageId);
}
