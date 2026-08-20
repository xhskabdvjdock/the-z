import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import IslamicForm from "./IslamicForm";
import { IslamicConfigInput } from "./actions";

function defaultIslamicInput(): IslamicConfigInput {
  return {
    enabled: false,
    channelId: "",
    intervalMinutes: 60,
    contentTypes: ["quran", "hadith", "azkar"],
    allowedSources: ["Bukhari", "Muslim"],
    azkarCategories: ["أذكار الصباح", "أذكار المساء", "أذكار النوم"],
    antiRepeatMinutes: 180
  };
}

export default async function IslamicPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const ic = config?.islamicContent;
  const initial = defaultIslamicInput();
  if (ic) {
    initial.enabled = Boolean(ic.enabled);
    initial.channelId = ic.channelId ?? "";
    initial.intervalMinutes = ic.intervalMinutes;
    initial.contentTypes = Array.isArray(ic.contentTypes) && ic.contentTypes.length ? ic.contentTypes : initial.contentTypes;
    initial.allowedSources = Array.isArray(ic.allowedSources) && ic.allowedSources.length ? ic.allowedSources : initial.allowedSources;
    initial.azkarCategories = Array.isArray(ic.azkarCategories) && ic.azkarCategories.length ? ic.azkarCategories : initial.azkarCategories;
    initial.antiRepeatMinutes = ic.antiRepeatMinutes;
  }

  const status = {
    nextRunAt: ic?.nextRunAt ?? null,
    lastPosted: ic?.lastPosted ?? null
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الأذكار والمحتوى الإسلامي</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        نشر تلقائي لآيات من القرآن وأحاديث صحيحة وأذكار من تصنيفات محددة في قناة مخصصة،
        دون تكرار المحتوى خلال فترة قابلة للتعديل.
      </p>

      <div className="card mb-6 flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">النشر القادم:</span>
          <span>{status.nextRunAt ? new Date(status.nextRunAt).toLocaleString("ar-EG") : "غير مجدول — فعّل النظام لحساب الموعد"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">آخر منشور:</span>
          <span>{status.lastPosted ? new Date(status.lastPosted.at).toLocaleString("ar-EG") : "لا يوجد بعد"}</span>
        </div>
      </div>

      <IslamicForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}