import dotenv from "dotenv";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { handleMessageCreate, handleReactionAdd } from "./linkFixer.js";
import { handleInteraction } from "./interactions.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  allowedMentions: { parse: [] },
});

client.on("ready", (client) => {
  console.log(`${client.user.tag} is ready!`);
});

client.on("messageCreate", handleMessageCreate);
client.on("messageReactionAdd", handleReactionAdd);
client.on("interactionCreate", handleInteraction);

client.login(process.env.TOKEN);
