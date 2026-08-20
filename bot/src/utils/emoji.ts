/**
 * يحوّل إيموجي (نص) إلى الشكل الصالح الذي تقبله خيارات قوائم/أزرار discord.js:
 * - `<:name:id>` أو `<a:name:id>` → إيموجي مخصص { id, name }
 * - نص يونيكود → اسم فقط (مقصوص لـ 32 حرفًا وهو حد Discord)
 * - غير صالح/فارغ → undefined (يُسقط لئلا يفشل التحقق)
 */
export function resolveEmojiOption(
  emoji?: string
): { name: string; id?: string } | undefined {
  if (!emoji) return undefined;
  const trimmed = emoji.trim();
  if (!trimmed) return undefined;

  const custom = /^<a?:([^:]+):(\d+)>$/.exec(trimmed);
  if (custom) {
    return { name: custom[1].slice(0, 32), id: custom[2] };
  }

  if (/^[^<:>\s]+$/.test(trimmed)) {
    return { name: trimmed.slice(0, 32) };
  }
  return undefined;
}