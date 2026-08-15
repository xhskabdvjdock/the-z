import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { ExtendedClient } from "../../client";
import { GameAction } from "./types";
import { sessionManager, dispatchAction } from "./engine";
import { handleLobbyAction } from "./lobby";

/**
 * توزيع تفاعلات الألعاب. صيغة الـ customId:
 *   زر:    `game:<sessionId>:<action>[:<value>]`
 *   قائمة: `game:<sessionId>:<action>`  (القيمة من interaction.values)
 */
export function parseGameCustomId(customId: string): {
  sessionId: string;
  action: string;
  value: string;
} | null {
  const parts = customId.split(":");
  if (parts.length < 3 || parts[0] !== "game") return null;
  return {
    sessionId: parts[1],
    action: parts[2],
    value: parts.slice(3).join(":") ?? ""
  };
}

export function registerGameComponents(router: {
  registerButton: (prefix: string, handler: (i: ButtonInteraction, c: ExtendedClient) => Promise<void>) => void;
  registerSelect: (prefix: string, handler: (i: StringSelectMenuInteraction, c: ExtendedClient) => Promise<void>) => void;
}) {
  router.registerButton("game:", async (interaction, client) => {
    await handleGameButton(interaction, client);
  });
  router.registerSelect("game:", async (interaction, client) => {
    await handleGameSelect(interaction, client);
  });
}

async function handleGameButton(interaction: ButtonInteraction, client: ExtendedClient): Promise<void> {
  const parsed = parseGameCustomId(interaction.customId);
  if (!parsed) {
    await interaction.deferUpdate().catch(() => null);
    return;
  }
  const session = sessionManager.get(parsed.sessionId);
  if (!session) {
    await interaction
      .reply({ content: "انتهت هذه الجلسة أو لم تعد موجودة.", ephemeral: true })
      .catch(() => null);
    return;
  }

  // أزرار اللوبي
  if (["join", "leave", "start", "cancel"].includes(parsed.action) && session.status === "LOBBY") {
    await handleLobbyAction(session, parsed.action, interaction);
    return;
  }

  // تفاعل لعب عادي
  await interaction.deferUpdate().catch(() => null);
  const action: GameAction = {
    type: parsed.action,
    value: parsed.value,
    playerId: interaction.user.id
  };
  await dispatchAction(session, action);
}

async function handleGameSelect(interaction: StringSelectMenuInteraction, client: ExtendedClient): Promise<void> {
  const parsed = parseGameCustomId(interaction.customId);
  if (!parsed) {
    await interaction.deferUpdate().catch(() => null);
    return;
  }
  const session = sessionManager.get(parsed.sessionId);
  if (!session) {
    await interaction
      .reply({ content: "انتهت هذه الجلسة أو لم تعد موجودة.", ephemeral: true })
      .catch(() => null);
    return;
  }
  const value = interaction.values[0] ?? "";
  await interaction.deferUpdate().catch(() => null);
  const action: GameAction = {
    type: parsed.action,
    value,
    playerId: interaction.user.id
  };
  await dispatchAction(session, action);
}