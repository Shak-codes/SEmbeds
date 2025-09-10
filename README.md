# SEmbeds
**Fix Discord's janky embeds when it comes to X/Bluesky links.**

## Features
- Automatically fixes embeds from tweets sent into your discord server, no more typing vx in front of your links!
- Supports multiple images / gifs / videos or even a combination of all three.
- Translates tweets to english using DEEPL's API.
- Spotify Wrapped-Esque Stats at the end of the year.

## Adding the bot
Here's a link to add the bot to your own discord server(won't hack you I promise). I recommend looking through
the Data & Privacy section to ensure you're comfortable with the data this bot saves prior to adding it to
your server.
- https://discord.com/oauth2/authorize?client_id=1173714092582772868

## Data & Privacy
SEmbeds only stores the following info, from Discord messages that contain a Twitter/Bluesky link:
- The type of link: Twitter / Bluesky
- The server id: used to get the name of the server for wrapped
- The user id: used to get the name of the user for wrapped
- The message timestamp
- The number of images/videos/gifs in the link
- A true or false flag indicating whether the link was the first Twitter/Bluesky link the bot has processed on the given day.

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
