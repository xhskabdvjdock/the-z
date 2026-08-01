import {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from "discord.js";
import { ExtendedClient } from "../client";

type ButtonHandler = (interaction: ButtonInteraction, client: ExtendedClient) => Promise<void>;
type SelectHandler = (
  interaction: StringSelectMenuInteraction,
  client: ExtendedClient
) => Promise<void>;
type ModalHandler = (interaction: ModalSubmitInteraction, client: ExtendedClient) => Promise<void>;

/**
 * موجّه بسيط لتوزيع تفاعلات الأزرار/القوائم/النماذج على الموديول المسؤول عنها
 * بالاعتماد على بادئة الـ customId (مثال: "ticket_open_support" تُوجَّه لموديول التذاكر).
 */
export class ComponentRouter {
  private buttons: { prefix: string; handler: ButtonHandler }[] = [];
  private selects: { prefix: string; handler: SelectHandler }[] = [];
  private modals: { prefix: string; handler: ModalHandler }[] = [];

  registerButton(prefix: string, handler: ButtonHandler) {
    this.buttons.push({ prefix, handler });
  }

  registerSelect(prefix: string, handler: SelectHandler) {
    this.selects.push({ prefix, handler });
  }

  registerModal(prefix: string, handler: ModalHandler) {
    this.modals.push({ prefix, handler });
  }

  async dispatchButton(interaction: ButtonInteraction, client: ExtendedClient) {
    const found = this.buttons.find((b) => interaction.customId.startsWith(b.prefix));
    if (found) await found.handler(interaction, client);
  }

  async dispatchSelect(interaction: StringSelectMenuInteraction, client: ExtendedClient) {
    const found = this.selects.find((s) => interaction.customId.startsWith(s.prefix));
    if (found) await found.handler(interaction, client);
  }

  async dispatchModal(interaction: ModalSubmitInteraction, client: ExtendedClient) {
    const found = this.modals.find((m) => interaction.customId.startsWith(m.prefix));
    if (found) await found.handler(interaction, client);
  }
}

export const componentRouter = new ComponentRouter();
