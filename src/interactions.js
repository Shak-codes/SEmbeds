import {
  fetchWrapped,
  fetchYears,
  selectableYears,
  buildPage,
  PAGE_PREFIX,
} from "./wrapped.js";
import { safeError } from "./webhookManager.js";

export const COMMAND = "sembeds";
const PUBLIC = process.env.WRAPPED_PUBLIC === "true";
export const WRAPPED_SUBCOMMAND = "wrapped";

const show = async (interaction, year, page, edit, ownerId) => {
  const data = await fetchWrapped(
    year,
    ownerId ?? interaction.user.id,
    interaction.guildId ?? undefined
  );
  const payload = await buildPage(interaction.client, data, page);
  await edit(payload);
};

async function handleCommand(interaction) {
  await interaction.deferReply({ ephemeral: !PUBLIC });

  const available = selectableYears(await fetchYears());
  if (available.length === 0) {
    await interaction.editReply("There is no wrapped to show yet.");
    return;
  }

  const year = interaction.options.getInteger("year") ?? available[0];
  if (!available.includes(year)) {
    await interaction.editReply(
      `No wrapped for ${year} yet. Try ${available.join(" or ")}.`
    );
    return;
  }

  await show(interaction, year, 0, (payload) => interaction.editReply(payload));
}

async function handlePage(interaction) {
  const [, year, page, ownerId] = interaction.customId.split(":");
  await show(
    interaction,
    Number(year),
    Number(page),
    (payload) => interaction.update(payload),
    ownerId || interaction.user.id
  );
}

export async function handleInteraction(interaction) {
  try {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === COMMAND &&
      interaction.options.getSubcommand() === WRAPPED_SUBCOMMAND
    ) {
      await handleCommand(interaction);
      return;
    }

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(`${PAGE_PREFIX}:`)
    ) {
      await handlePage(interaction);
    }
  } catch (err) {
    console.error("Wrapped failed:", safeError(err));
    const message = {
      content: "Could not build your wrapped right now.",
      embeds: [],
      components: [],
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({ ...message, ephemeral: true }).catch(() => {});
    }
  }
}
