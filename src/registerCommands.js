import dotenv from "dotenv";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { COMMAND, WRAPPED_SUBCOMMAND } from "./interactions.js";
import { fetchYears, selectableYears } from "./wrapped.js";

dotenv.config();

const available = selectableYears(await fetchYears());
if (available.length === 0) {
  console.error("No wrapped years are available yet, so nothing was registered.");
  process.exit(1);
}

const years = available.map((year) => ({ name: String(year), value: year }));
console.log("Offering years:", available.join(", "));

const commands = [
  new SlashCommandBuilder()
    .setName(COMMAND)
    .setDescription("SEmbeds commands")
    .addSubcommand((sub) =>
      sub
        .setName(WRAPPED_SUBCOMMAND)
        .setDescription("Your SEmbeds year in review")
        .addIntegerOption((option) =>
          option
            .setName("year")
            .setDescription("Which year to wrap")
            .addChoices(...years)
        )
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
const me = await rest.get(Routes.user("@me"));

const guildId = process.env.GUILD_ID;
const route = guildId
  ? Routes.applicationGuildCommands(me.id, guildId)
  : Routes.applicationCommands(me.id);

await rest.put(route, { body: commands });

console.log(
  `Registered /${COMMAND} for ${me.username} ${guildId ? `in guild ${guildId}` : "globally"}.`
);
