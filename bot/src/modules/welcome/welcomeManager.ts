import { AttachmentBuilder, BaseMessageOptions, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { IGuildConfig, VariableContext } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { buildMessageFromCustom } from "../../utils/embed";

function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

function formatDate(date: Date | null): string | undefined {
  if (!date) return undefined;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildContext(member: GuildMember): VariableContext {
  return {
    user: {
      id: member.id,
      username: member.user.username,
      tag: member.user.tag,
      mention: `<@${member.id}>`,
      avatarURL: member.displayAvatarURL({ extension: "png", size: 256 }),
      joinedAt: formatDate(member.joinedAt)
    },
    server: {
      name: member.guild.name,
      id: member.guild.id,
      memberCount: member.guild.memberCount,
      iconURL: member.guild.iconURL({ extension: "png" }) ?? undefined
    }
  };
}

/** يولّد صورة ترحيب/وداع بالانتماء للعضو باستخدام @napi-rs/canvas */
async function generateImage(
  member: GuildMember,
  background: string | undefined,
  type: "welcome" | "leave"
): Promise<Buffer> {
  const width = 1000;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let hasBackgroundImage = false;
  if (background && (background.startsWith("data:image/") || /^https?:\/\//i.test(background))) {
    try {
      const bgImage = await loadImage(background);
      ctx.drawImage(bgImage, 0, 0, width, height);
      hasBackgroundImage = true;
    } catch {
      hasBackgroundImage = false;
    }
  }

  if (!hasBackgroundImage) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1e1b4b");
    gradient.addColorStop(1, "#5865f2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // طبقة تعتيم خفيفة لتحسين وضوح النص فوق الخلفية
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, width, height);

  const avatarSize = 180;
  const avatarX = width / 2 - avatarSize / 2;
  const avatarY = 45;

  try {
    const avatarURL = member.displayAvatarURL({ extension: "png", size: 256 });
    const avatarImage = await loadImage(avatarURL);

    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // تجاهل الخطأ إن تعذّر تحميل صورة العضو
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  const title = type === "welcome" ? "أهلاً بك" : "وداعاً";
  ctx.fillText(`${title} ${member.user.username}`, width / 2, avatarY + avatarSize + 60);

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(
    `عضو رقم ${member.guild.memberCount} في ${member.guild.name}`,
    width / 2,
    avatarY + avatarSize + 105
  );

  return canvas.encode("png");
}

/** يرفق صورة مولّدة كـ AttachmentBuilder ضمن payload، ويحدّث صورة الإيمبد إن وُجد */
function attachImage(payload: BaseMessageOptions, buffer: Buffer): void {
  const attachment = new AttachmentBuilder(buffer, { name: "welcome.png" });
  payload.files = [attachment];

  if (payload.embeds && payload.embeds.length > 0) {
    const original = payload.embeds[0];
    const embed = original instanceof EmbedBuilder ? original : EmbedBuilder.from(original as any);
    embed.setImage("attachment://welcome.png");
    payload.embeds = [embed];
  }
}

async function sendPayload(
  member: GuildMember,
  channelId: string | undefined,
  sendInDm: boolean,
  payload: BaseMessageOptions
): Promise<void> {
  if (sendInDm) {
    await member.send(payload as any).catch(() => null);
    return;
  }

  if (!channelId) return;
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return;
  await (channel as TextChannel).send(payload as any).catch(() => null);
}

export async function sendWelcomeMessage(
  client: ExtendedClient,
  member: GuildMember,
  gConfig: IGuildConfig
): Promise<void> {
  if (!gConfig.welcome?.enabled) return;

  const varsCtx = buildContext(member);
  const payload = buildMessageFromCustom(gConfig.welcome.message, varsCtx, gConfig);

  if (gConfig.welcome.imageEnabled) {
    try {
      const buffer = await generateImage(member, gConfig.welcome.imageBackground, "welcome");
      attachImage(payload, buffer);
    } catch {
      // تجاهل فشل توليد الصورة، ترسل الرسالة بدونها
    }
  }

  await sendPayload(member, gConfig.welcome.channelId, gConfig.welcome.sendInDm, payload);
}

export async function sendLeaveMessage(
  client: ExtendedClient,
  member: GuildMember,
  gConfig: IGuildConfig
): Promise<void> {
  if (!gConfig.leave?.enabled) return;

  const varsCtx = buildContext(member);
  const payload = buildMessageFromCustom(gConfig.leave.message, varsCtx, gConfig);

  if (gConfig.leave.imageEnabled) {
    try {
      const buffer = await generateImage(member, gConfig.leave.imageBackground, "leave");
      attachImage(payload, buffer);
    } catch {
      // تجاهل فشل توليد الصورة، ترسل الرسالة بدونها
    }
  }

  await sendPayload(member, gConfig.leave.channelId, false, payload);
}
