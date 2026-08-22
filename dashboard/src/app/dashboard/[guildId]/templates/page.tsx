import { ensureDb } from "@/lib/db";
import { ServerTemplate } from "@thez/shared";
import TemplatesForm from "./TemplatesForm";

export default async function TemplatesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const templates = await ServerTemplate.find({}).sort({ createdAt: -1 }).limit(50);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">قوالب السيرفر</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        احفظ إعدادات ورتب ورومات سيرفرك كقالب، وطبّقه على أي سيرفر آخر بضغطة واحدة.
      </p>
      <TemplatesForm guildId={params.guildId} templates={templates} />
    </div>
  );
}