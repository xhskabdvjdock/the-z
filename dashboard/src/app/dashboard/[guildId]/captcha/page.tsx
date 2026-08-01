import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import CaptchaForm from "./CaptchaForm";

export default async function CaptchaPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId)
  ]);

  const initial: IGuildConfig["captcha"] = {
    enabled: config?.captcha?.enabled ?? false,
    type: config?.captcha?.type ?? "button",
    verifiedRoleId: config?.captcha?.verifiedRoleId ?? "",
    unverifiedRoleId: config?.captcha?.unverifiedRoleId ?? "",
    channelId: config?.captcha?.channelId ?? "",
    kickAfterMinutes: config?.captcha?.kickAfterMinutes ?? 10
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">نظام التحقق (Captcha)</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        تأكد من أن كل عضو جديد إنسان حقيقي عبر مطالبته بالضغط على زر تحقق قبل منحه صلاحيات
        السيرفر الكاملة.
      </p>
      <CaptchaForm guildId={params.guildId} initial={initial} channels={channels} roles={roles} />
    </div>
  );
}
