# SEmbeds
**Fix Discord's janky embeds when it comes to X/Bluesky links.**

## Features
- Automatically fixes embeds from tweets sent into your discord server, no more typing vx in front of your links!
- Supports multiple images / gifs / videos or even a combination of all three.
- Translates tweets to english using DEEPL's API.
- Reposts the fixed embed **as you**, with your name and avatar rather than the bot's.
- React ❌ on your own repost to delete it.

## How the impersonation works
A bot cannot edit another user's message, so the bot deletes the original and
reposts it through a channel webhook with `username` and `avatarURL` set to the
author's. Those are per-message fields, so **one webhook per channel** covers every
member. The bot never creates one per user.

Notes and limitations:
- Webhooks cannot reply. Replies become a `-# ↪ replying to …` jump link instead.
- Threads and forum posts cannot own webhooks; the parent channel's webhook is used
  with a `threadId`.
- Messages carrying stickers or a poll are left alone, since they cannot be reposted.
- Ownership for the ❌ affordance is held in memory with a 24h TTL, so it does not
  survive a restart.

## Link
Here's a link to add the bot to your own discord server(won't hack you I promise)
- https://discord.com/oauth2/authorize?client_id=1173714092582772868&permissions=536996928&scope=bot

### Required permissions
`536996928`: View Channel, Send Messages, Manage Messages, Manage Webhooks,
Embed Links, Attach Files, Add Reactions, Read Message History.

Without Manage Messages or Manage Webhooks the bot degrades to posting the embed
under its own name rather than going silent.

### Required intents
`Guilds`, `GuildMessages`, `MessageContent` (privileged, enable it in the developer
portal), `GuildMessageReactions`.

## Examples
### Linking a lone tweet
![image](https://github.com/user-attachments/assets/d20f833e-adb9-431d-82ff-3c89c1e8c0fa)

### Linking a tweet with message content
![image](https://github.com/user-attachments/assets/481dc136-90d3-4793-9e0e-5ca595f01ba7)

### Linking a tweet with multiple images
![image](https://github.com/user-attachments/assets/7c8b0c82-fd68-40c3-9581-6de46a526f05)

### Linking a tweet with multiple videos / gifs
![image](https://github.com/user-attachments/assets/b5bd49dd-4761-41dc-b19c-7e1d108d29d7)

### Tweet translation
![image](https://github.com/user-attachments/assets/0ade8af3-ca83-45c2-8ae5-fd3a41d4ba67)
