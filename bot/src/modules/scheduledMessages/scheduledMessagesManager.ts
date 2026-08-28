import { BaseMessageOptions, EmbedBuilder } from "discord.js";
import { GuildConfig, IScheduledMessage } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { getGuildConfig, invalidateGuildConfigCache } from "../../utils/guildConfig";
import { logError } from "../../utils/logger";

const CHECK_INTERVAL_MS = 30 * 1000;

function buildPayload(msg: IScheduledMessage): BaseMessageOptions {
  const payload: BaseMessageOptions = {};
  if (msg.content) payload.content = msg.content;
  if (msg.embed?.enabled) {
    const embed = new EmbedBuilder().setColor((msg.embed.color || "#5865F2") as any);
    if (msg.embed.title) embed.setTitle(msg.embed.title);
    if (msg.embed.description) embed.setDescription(msg.embed.description);
    payload.embeds = [embed];
  }
  return payload;
}

/** يرسل أي رسالة مجدولة حان وقتها، ثم يحدّث موعدها التالي أو يعطّلها إن كانت مرة واحدة */
async function processGuild(client: ExtendedClient, guildId: string): Promise<void> {
  const gConfig = await getGuildConfig(client, guildId);
  const due = (gConfig.scheduledMessages ?? []).filter(
    (m) => m.enabled && m.runAt && new Date(m.runAt).getTime() <= Date.now()
  );
  if (due.length === 0) return;

  for (const msg of due) {
    const payload = buildPayload(msg);
    const hasContent = msg.content?.trim() || msg.embed?.enabled;
    if (hasContent) {
      try {
        const channel = await client.channels.fetch(msg.channelId).catch(() => null);
        if (channel?.isTextBased()) {
          await (channel as any).send(payload);
        }
      } catch (err) {
        logError("scheduled-messages/send", err);
      }
    }

    const nowIso = new Date().toISOString();
    if (msg.repeatMinutes > 0) {
      msg.runAt = new Date(Date.now() + msg.repeatMinutes * 60_000).toISOString();
    } else {
      msg.enabled = false;
    }
    msg.lastRunAt = nowIso;
  }

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { scheduledMessages: gConfig.scheduledMessages } }
  );
  invalidateGuildConfigCache(client, guildId);
}

/** حلقة دورية تفحص الرسائل المجدولة كل 30 ثانية */
export function startScheduledMessages(client: ExtendedClient): void {
  setInterval(() => {
    for (const guild of client.guilds.cache.values()) {
      processGuild(client, guild.id).catch((err) => logError("scheduled-messages", err));
    }
  }, CHECK_INTERVAL_MS);
}