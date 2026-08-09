import { checkCooldown, registerCooldown, CooldownStore, ICommandOverride } from "@thez/shared";
import { ExtendedClient } from "../client";
import { BotCommand } from "../types/command";

/** مفتاح البرودة الموحّد لأمر+سيرفر+مستخدم */
export function cooldownKey(commandName: string, guildId: string, userId: string): string {
  return `${commandName}:${guildId}:${userId}`;
}

/**
 * المدة الفعّالة: override بالبرودة الخاصة به > cooldown الخاص بالأمر نفسه.
 * يبقى هذا هو المصدر الوحيد لحساب البرودة حتى لا يتكرر المنطق في المسارين.
 */
export function effectiveCooldownSeconds(
  command: BotCommand,
  override?: ICommandOverride
): number {
  const fromOverride = override?.cooldownSeconds;
  if (typeof fromOverride === "number" && fromOverride > 0) return fromOverride;
  return command.cooldownSeconds ?? 0;
}

export function getCooldownStore(client: ExtendedClient): CooldownStore {
  return client.commandCooldowns;
}

/** فحص البرودة (لا يعدّل أي شيء) — ينادي على مثيل التخزين الخاص بالـ client */
export function checkCommandCooldown(
  client: ExtendedClient,
  command: BotCommand,
  guildId: string,
  userId: string,
  override?: ICommandOverride
) {
  const seconds = effectiveCooldownSeconds(command, override);
  if (seconds <= 0) return { allowed: true as const, remainingSeconds: 0 };
  return checkCooldown(getCooldownStore(client), cooldownKey(command.name, guildId, userId), seconds);
}

/** تسجيل بداية البرودة بعد الموافقة على تنفيذ الأمر */
export function applyCommandCooldown(
  client: ExtendedClient,
  command: BotCommand,
  guildId: string,
  userId: string,
  override?: ICommandOverride
): void {
  const seconds = effectiveCooldownSeconds(command, override);
  if (seconds <= 0) return;
  registerCooldown(getCooldownStore(client), cooldownKey(command.name, guildId, userId));
}