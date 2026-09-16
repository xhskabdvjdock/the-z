import { EmbedBuilder, GuildMember } from "discord.js";
import { BotEvent } from "../types/event";
import { ExtendedClient } from "../client";
import { IGuildConfig, JailUser } from "@thez/shared";
import { getGuildConfig } from "../utils/guildConfig";
import { handleAutoRole } from "../modules/autoRole";
import { handleMemberJoinCaptcha } from "../modules/captcha/captcha";
import { sendWelcomeMessage } from "../modules/welcome/welcomeManager";
import { sendLog } from "../modules/logging/logger";
import { dispatchEvent, onEvent } from "../utils/eventRouter";
import { trackJoin } from "../modules/analytics/analytics";

export interface MemberJoinContext {
  client: ExtendedClient;
  member: GuildMember;
  gConfig: IGuildConfig;
}

async function handleJailReapply(ctx: MemberJoinContext): Promise<void> {
  const { member, gConfig } = ctx;
  if (!gConfig.jail?.enabled || !gConfig.jail.roleId) return;
  let jailRecord = await JailUser.findOne({ userId: member.id, guildId: member.guild.id });
  if (jailRecord) {
    // انتهت مدة الج إوم الصادرة مسبقاً — لا نعيد تفعيله وننظف السجل
    if (
      jailRecord.jailedUntil &&
      new Date(jailRecord.jailedUntil).getTime() <= Date.now()
    ) {
      await JailUser.deleteOne({ userId: member.id, guildId: member.guild.id }).catch(
        () => null
      );
      jailRecord = null;
    }
  }
  if (jailRecord) {
    const jailRole = member.guild.roles.cache.get(gConfig.jail.roleId);
    if (jailRole) {
      // Re-apply jail role
      await member.roles.add(jailRole).catch(() => null);

      // Remove roles that should be removed when jailed
      const rolesToRemove = member.roles.cache.filter(r => gConfig.jail.removeRoles.includes(r.id));
      if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove).catch(() => null);
      }
    }
  }
}

async function handleCaptchaStep(ctx: MemberJoinContext): Promise<boolean> {
  const { client, member, gConfig } = ctx;
  if (!gConfig.captcha?.enabled) return false;
  const handled = await handleMemberJoinCaptcha(client, member, gConfig);
  // موديول الكابتشا سيتكفّل بمنح الرولات وإرسال الترحيب بعد التحقق
  return handled === true;
}

async function handleAutoRoleStep(ctx: MemberJoinContext): Promise<void> {
  await handleAutoRole(ctx.client, ctx.member, ctx.gConfig);
}

async function handleWelcomeStep(ctx: MemberJoinContext): Promise<void> {
  await sendWelcomeMessage(ctx.client, ctx.member, ctx.gConfig);
}

async function handleMemberLogStep(ctx: MemberJoinContext): Promise<void> {
  const { member } = ctx;
  const accountAge = Date.now() - member.user.createdTimestamp;
  const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000; // less than 7 days

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("📥 Member Joined")
    .addFields(
      { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
      { name: "Account Age", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Server Members", value: `${member.guild.memberCount}`, inline: true },
      { name: "New Account", value: isNewAccount ? "Yes ⚠️" : "No", inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `User ID: ${member.id}` })
    .setTimestamp();

  await sendLog(ctx.client, member.guild.id, "members", embed);
}

// تسجيل المعالجات مرة واحدة — نفس الترتيب والسلوك السابق تمامًا
onEvent("guildMemberAdd", "jail-reapply", handleJailReapply);
onEvent("guildMemberAdd", "captcha", handleCaptchaStep);
onEvent("guildMemberAdd", "autorole", handleAutoRoleStep);
onEvent("guildMemberAdd", "welcome", handleWelcomeStep);
onEvent("guildMemberAdd", "member-log", handleMemberLogStep);

const event: BotEvent = {
  name: "guildMemberAdd",
  async execute(client, member: GuildMember) {
    // جلب واحد للإعدادات — يُمرَّر لكل المعالجات
    const gConfig = await getGuildConfig(client, member.guild.id);
    if (!member.user.bot) trackJoin(member.guild.id);
    await dispatchEvent("guildMemberAdd", { client, member, gConfig } satisfies MemberJoinContext);
  }
};

export default event;
