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
### Linking a lone post
<img width="490" height="514" alt="image" src="https://github.com/user-attachments/assets/e5c6528c-9ed8-45de-86f1-5a6495923b01" />

### Linking a post with message content
<img width="491" height="927" alt="image" src="https://github.com/user-attachments/assets/3be2060b-7a06-44f3-957f-11f3f4e2af86" />

### Linking a post with images
<img width="494" height="676" alt="image" src="https://github.com/user-attachments/assets/850796cc-00a5-4161-ada9-706fff10341c" />

### Linking a post with videos / gifs (Tweets only)
<img width="488" height="566" alt="image" src="https://github.com/user-attachments/assets/26c617ff-5f4a-431f-b353-479e81934b4c" />

### Post translation
<img width="491" height="367" alt="image" src="https://github.com/user-attachments/assets/20d78191-bcf3-4485-9299-67e4d07a81b6" />

### Wrapped
TBD. Example images soon.
