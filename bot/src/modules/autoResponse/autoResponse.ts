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

const autoResponseCooldown = new Map<string, number>();

/** يفحص الردود التلقائية المفعّلة، ويرسل رد عشوائي من الردود المتاحة. يعيد true إن تم الرد */
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
    if (response.ignoreBots === false && message.author.bot) continue;

    // تحقق من الرتب المطلوبة
    if (response.requiredRoleIds?.length) {
      const member = message.member ?? (await message.guild?.members.fetch(message.author.id).catch(() => null));
      if (!member || !response.requiredRoleIds.some((id) => member.roles.cache.has(id))) continue;
    }

    // تحقق من الكولداون
    if (response.cooldownSeconds) {
      const key = `${message.guild!.id}:${response.id}:${message.author.id}`;
      const last = autoResponseCooldown.get(key) ?? 0;
      if (Date.now() - last < response.cooldownSeconds * 1000) continue;
      autoResponseCooldown.set(key, Date.now());
    }

    if (response.deleteTrigger) {
      await message.delete().catch(() => null);
    }

    const ctx = buildContext(message);
    
    const responseMessages = response.responses || (response.response ? [response.response] : []);

    if (responseMessages.length > 0) {
      const randomIndex = Math.floor(Math.random() * responseMessages.length);
      const randomResponse = responseMessages[randomIndex];
      const payload = buildMessageFromCustom(randomResponse, ctx);
      if (message.inGuild()) {
        await message.channel.send(payload).catch(() => null);
      }
    }

    return true;
  }

  return false;
}
