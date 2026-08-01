import { Message } from "discord.js";
import { IAutoResponse, IGuildConfig, VariableContext } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { buildMessageFromCustom } from "../../utils/embed";

function isMatch(content: string, response: IAutoResponse): boolean {
  const trigger = response.trigger ?? "";
  if (!trigger) return false;

  switch (response.matchType) {
    case "exact":
      return content.trim().toLowerCase() === trigger.trim().toLowerCase();
    case "startsWith":
      return content.trim().toLowerCase().startsWith(trigger.trim().toLowerCase());
    case "regex":
      try {
        const regex = new RegExp(trigger, "i");
        return regex.test(content);
      } catch {
        return false;
      }
    case "contains":
    default:
      return content.toLowerCase().includes(trigger.toLowerCase());
  }
}

function buildContext(message: Message): VariableContext {
  return {
    user: {
      id: message.author.id,
      username: message.author.username,
      tag: message.author.tag,
      mention: `<@${message.author.id}>`,
      avatarURL: message.author.displayAvatarURL()
    },
    server: {
      name: message.guild!.name,
      id: message.guild!.id,
      memberCount: message.guild!.memberCount,
      iconURL: message.guild!.iconURL() ?? undefined
    }
  };
}

/** يفحص الردود التلقائية المفعّلة، ويرسل أول رد مطابق. يعيد true إن تم الرد */
export async function handleAutoResponse(
  client: ExtendedClient,
  message: Message,
  gConfig: IGuildConfig
): Promise<boolean> {
  const responses = gConfig.autoResponses ?? [];

  for (const response of responses) {
    if (!response.enabled) continue;
    if (response.channelIds?.length && !response.channelIds.includes(message.channelId)) continue;
    if (!isMatch(message.content, response)) continue;

    if (response.deleteTrigger) {
      await message.delete().catch(() => null);
    }

    const ctx = buildContext(message);
    const payload = buildMessageFromCustom(response.response, ctx);
    if (message.inGuild()) {
      await message.channel.send(payload).catch(() => null);
    }

    return true;
  }

  return false;
}
