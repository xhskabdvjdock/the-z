import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import WelcomeForm from "./WelcomeForm";
import { WelcomeLeaveInput } from "./actions";

export default async function WelcomePage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial: WelcomeLeaveInput = {
    welcome: {
      enabled: config?.welcome?.enabled ?? false,
      channelId: config?.welcome?.channelId ?? "",
      sendInDm: config?.welcome?.sendInDm ?? false,
      imageEnabled: config?.welcome?.imageEnabled ?? true,
      imageBackground: config?.welcome?.imageBackground ?? "",
      message: config?.welcome?.message ?? { enabled: true, content: "أهلاً بك {user} في {server} 🎉" }
    },
    leave: {
      enabled: config?.leave?.enabled ?? false,
      channelId: config?.leave?.channelId ?? "",
      imageEnabled: config?.leave?.imageEnabled ?? true,
      imageBackground: config?.leave?.imageBackground ?? "",
      message: config?.leave?.message ?? { enabled: true, content: "وداعاً {user.name} 👋" }
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الترحيب والمغادرة</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        خصّص رسائل ترحيب ومغادرة الأعضاء نصاً أو Embed أو صورة تلقائية.
      </p>
      <WelcomeForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}
