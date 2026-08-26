import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember } from "discord.js";
import { ExtendedClient } from "../client";
import { AfkUser, JailUser } from "@thez/shared";
import { getGuildConfig } from "../utils/guildConfig";
import { config } from "../config";
import translate from "translate";
import { releaseJailedMember } from "../modules/jail/expiry";
import { recordModerationLog } from "../modules/moderation/auditLog";

// ضبط محرك الترجمة
translate.engine = "google";

// ذاكرة مؤقتة للترجمات — محدودة الحجم لمنع نمو غير محدود
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const CACHE_MAX_ENTRIES = 500;

function cacheSet(key: string, value: { text: string; timestamp: number }): void {
  if (translationCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = translationCache.keys().next().value;
    if (oldest !== undefined) translationCache.delete(oldest);
    const now = Date.now();
    for (const [k, v] of translationCache) {
      if (now - v.timestamp >= CACHE_DURATION) translationCache.delete(k);
    }
  }
  translationCache.set(key, value);
}

/**
 * يعالج الأوامر ذات البادئة الثابتة (`,tr | ,afk | ,avatar | ,banner | ,jail | ,unjail`).
 * يُرجع `true` إذا تمّت معالجة الرسالة ويجب إيقاف المعالجة اللاحقة.
 */
export async function handleLegacyPrefixCommands(
  client: ExtendedClient,
  message: Message
): Promise<boolean> {
  const content = message.content;

  // ────── ,tr ── ترجمة ──────────────────────────────────────────────────────
  if (content.startsWith(",tr")) {
    const referencedMessage = message.reference?.messageId
      ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null)
      : null;

    let text = referencedMessage?.content || "";

    if (!text) {
      text = content.slice(3).trim();
    }

    if (!text) {
      await message.reply("يجب تحديد رسالة لترجمتها (رد على رسالة واستخدم ,tr)");
      return true;
    }

    const isArabic = /[\u0600-\u06FF]/.test(text);
    const targetLang = isArabic ? "en" : "ar";
    const cacheKey = `${text.substring(0, 100)}_${targetLang}`;
    const cached = translationCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      const display = cached.text.length > 4096 ? cached.text.substring(0, 4093) + "..." : cached.text;
      await message.reply({
        embeds: [new EmbedBuilder().setColor(config.defaultColor).setDescription(display)]
      });
      return true;
    }

    // محاولة ترجمة مع إعادة محاولة و fallback — استخدام Google API المباشر كـ أساسي (أكثر موثوقية)
    let translated: string | null = null;
    let lastError: string | null = null;

    // المحاولة 1: Google API المباشر
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const sl = isArabic ? "ar" : "auto";
        const tl = targetLang;
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text.slice(0, 1000))}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          const gtrans = data?.[0]?.map((x: any) => x[0]).join(" ");
          if (gtrans?.trim()) {
            translated = gtrans;
            break;
          }
        }
        throw new Error("empty translation");
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }

    // المحاولة 2: Fallback MyMemory API مع إعادة محاولة عند 429
    if (!translated?.trim()) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const langPair = isArabic ? "ar|en" : "en|ar";
          const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${langPair}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const contentType = res.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const data = (await res.json()) as any;
              const mymem = data?.responseData?.translatedText;
              if (mymem && mymem.trim() && !mymem.includes("MYMEMORY WARNING")) {
                translated = mymem;
                break;
              }
            } else {
              lastError = "خدمة الترجمة مشغولة حاليًا";
            }
          } else if (res.status === 429) {
            lastError = "خدمة الترجمة مشغولة حاليًا";
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
          } else {
            lastError = `خدمة الترجمة ردت بـ ${res.status}`;
          }
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Unexpected token") || msg.includes("<html")) {
            lastError = "خدمة الترجمة مشغولة حاليًا";
          } else {
            lastError = msg;
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // المحاولة 3: Google API المباشر
    if (!translated?.trim()) {
      try {
        const sl = isArabic ? "ar" : "en";
        const tl = targetLang;
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text.slice(0, 500))}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          const gtrans = data?.[0]?.map((x: any) => x[0]).join(" ");
          if (gtrans?.trim()) translated = gtrans;
        }
      } catch {}
    }

    // المحاولة 4: LibreTranslate كـ fallback أخير
    if (!translated?.trim()) {
      try {
        const res = await fetch("https://libretranslate.com/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text.slice(0, 500), source: isArabic ? "ar" : "en", target: targetLang, format: "text" }),
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data?.translatedText?.trim()) translated = data.translatedText;
        }
      } catch {}
    }

    if (!translated?.trim()) {
      const isAutoError = lastError?.includes("ISO 639-1");
      const isHtmlError = lastError?.includes("Unexpected token") || lastError?.includes("<html");
      const isBusyError = lastError?.includes("مشغولة") || lastError?.includes("429");
      if (isAutoError || isHtmlError) lastError = null;
      const displayError = lastError ? ` — ${lastError.slice(0, 100)}` : isBusyError ? " — الخدمة مشغولة، حاول بعد دقيقة" : "";
      await message.reply(`فشلت الترجمة${displayError}، حاول مرة أخرى بعد ثوانٍ`);
      return true;
    }

    const finalText = translated.length > 4096 ? translated.substring(0, 4093) + "..." : translated;
    cacheSet(cacheKey, { text: translated, timestamp: now });

    await message.reply({
      embeds: [new EmbedBuilder().setColor(config.defaultColor).setDescription(finalText)]
    });
    return true;
  }

  // ────── ,afk ─────────────────────────────────────────────────────────────
  if (content.startsWith(",afk")) {
    const reason = content.slice(4).trim() || "No reason provided";
    const guildId = message.guild!.id;
    const userId = message.author.id;

    try {
      const existing = await AfkUser.findOne({ guildId, userId });

      if (existing?.status) {
        await AfkUser.findOneAndUpdate({ guildId, userId }, { $set: { status: false, mentionCount: 0 } });
        await message.reply({
          embeds: [new EmbedBuilder().setColor(config.defaultColor).setDescription("You are no longer AFK.")]
        });
        return true;
      }

      const afkData = { guildId, userId, status: true, reason, mentionCount: 0, since: new Date() };
      if (existing) {
        await AfkUser.findOneAndUpdate({ guildId, userId }, { $set: afkData });
      } else {
        await AfkUser.create(afkData);
      }

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.defaultColor)
            .setDescription(`You are now AFK. Reason: ${reason}`)
        ]
      });
    } catch {
      await message.reply({ content: "Failed to set AFK status. Please try again." });
    }
    return true;
  }

  // ────── ,avatar ───────────────────────────────────────────────────────────
  if (content.startsWith(",avatar")) {
    const args = content.slice(7).trim().split(/\s+/);
    const useServerAvatar = args.includes("server");

    let targetMember: GuildMember | null = null;

    if (message.mentions.users.size > 0) {
      const mentioned = message.mentions.users.first();
      if (mentioned && !mentioned.bot) {
        targetMember = await message.guild!.members.fetch(mentioned.id).catch(() => null);
      }
    }

    if (!targetMember) {
      const rawId = args.find((a) => /^\d+$/.test(a));
      if (rawId) targetMember = await message.guild!.members.fetch(rawId).catch(() => null);
    }

    if (!targetMember) targetMember = message.member!;

    const avatarUrl =
      useServerAvatar && targetMember.avatar
        ? targetMember.avatarURL({ size: 4096 }) ?? targetMember.user.displayAvatarURL({ size: 4096 })
        : targetMember.user.displayAvatarURL({ size: 4096 });

    const avatarType = useServerAvatar && targetMember.avatar ? "Server Avatar" : "Global Avatar";

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`${targetMember.user.tag}'s ${avatarType}`)
      .setImage(avatarUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(avatarUrl),
      new ButtonBuilder().setLabel("Open in Browser").setStyle(ButtonStyle.Link).setURL(avatarUrl)
    );

    await message.reply({ embeds: [embed], components: [row] });
    return true;
  }

  // ────── ,banner ───────────────────────────────────────────────────────────
  if (content.startsWith(",banner")) {
    const args = content.slice(7).trim().split(/\s+/);
    const useServerBanner = args.includes("server");
    const targetId = args.find((a) => /^\d+$/.test(a)) ?? message.author.id;

    const targetMember = await message.guild!.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await message.reply({ content: "Could not find that user." });
      return true;
    }

    let bannerUrl: string | null;
    let bannerType: string;

    if (useServerBanner) {
      bannerUrl = targetMember.guild.bannerURL({ size: 4096 });
      bannerType = "Server Banner";
    } else {
      const fullUser = await message.client.users.fetch(targetMember.user.id, { force: true }).catch(() => null);
      bannerUrl = fullUser?.bannerURL({ size: 4096 }) ?? null;
      bannerType = "Profile Banner";
    }

    if (!bannerUrl) {
      await message.reply({ content: "This user does not have a banner." });
      return true;
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`${targetMember.user.tag}'s ${bannerType}`)
      .setImage(bannerUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(bannerUrl),
      new ButtonBuilder().setLabel("Open in Browser").setStyle(ButtonStyle.Link).setURL(bannerUrl)
    );

    await message.reply({ embeds: [embed], components: [row] });
    return true;
  }

  // ────── ,jail ─────────────────────────────────────────────────────────────
  if (content.startsWith(",jail") && !content.startsWith(",unjail")) {
    const args = content.slice(5).trim().split(/\s+/);
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const durationMinutes = Number.parseInt(args[1] ?? "", 10);

    if (durationMinutes && (isNaN(durationMinutes) || durationMinutes < 1)) {
      await message.reply("Duration must be a positive number of minutes.");
      return true;
    }

    if (!targetId) {
      await message.reply("Please specify a user to jail.");
      return true;
    }

    const targetMember = await message.guild!.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await message.reply("User not found.");
      return true;
    }

    const gConfig = await getGuildConfig(client, message.guild!.id);

    if (!message.member?.permissions.has("Administrator")) {
      await message.reply("Only administrators can use this command.");
      return true;
    }

    if (targetMember.id === message.author.id) {
      await message.reply("You cannot jail yourself.");
      return true;
    }

    if (targetMember.id === message.guild!.ownerId) {
      await message.reply("You cannot jail the server owner.");
      return true;
    }

    if (
      message.guild!.ownerId !== message.author.id &&
      targetMember.roles.highest.position >= message.member!.roles.highest.position
    ) {
      await message.reply("You cannot jail a member with an equal or higher role than yours.");
      return true;
    }

    if (targetMember.permissions.has("Administrator")) {
      await message.reply("Cannot jail administrators.");
      return true;
    }

    if (!targetMember.roles.cache.hasAny(...(gConfig.jail?.removeRoles ?? [])) && !targetMember.manageable) {
      // لا أستطيع تعديل رتب هذا العضو (رتبته أعلى من رتب البوت) — صدّ بشكل واضح وغير صامت
      await message.reply("I do not have permission to jail this member (role hierarchy).");
      return true;
    }

    if (!gConfig.jail?.enabled || !gConfig.jail.roleId) {
      await message.reply("Jail system is not configured.");
      return true;
    }

    const jailRole = message.guild!.roles.cache.get(gConfig.jail.roleId);
    if (!jailRole) {
      await message.reply("Jail role not found.");
      return true;
    }

    const existingJail = await JailUser.findOne({ userId: targetId, guildId: message.guild!.id });
    if (existingJail) {
      await message.reply("User is already jailed.");
      return true;
    }

    const removeRoles = gConfig.jail.removeRoles ?? [];
    const currentRoles = targetMember.roles.cache
      .filter((r) => r.id !== message.guild!.id && !removeRoles.includes(r.id))
      .map((r) => r.id);

    const rolesToRemove = targetMember.roles.cache.filter((r) => removeRoles.includes(r.id));
    if (rolesToRemove.size > 0) await targetMember.roles.remove(rolesToRemove).catch(() => null);

    await targetMember.roles.add(jailRole).catch(() => null);
    await JailUser.create({
      userId: targetId,
      guildId: message.guild!.id,
      originalRoles: currentRoles,
      jailedBy: message.author.id,
      jailedAt: new Date(),
      ...(durationMinutes > 0 ? { jailedUntil: new Date(Date.now() + durationMinutes * 60_000) } : {})
    });

    const durationText = durationMinutes > 0 ? ` for ${durationMinutes} minute(s)` : "";
    await message.reply(`Successfully jailed ${targetMember.user.tag}${durationText}.`);

    await recordModerationLog({
      guildId: message.guild!.id,
      userId: targetId,
      moderatorId: message.author.id,
      action: "jail",
      reason: "prefix jail",
      ...(durationMinutes > 0 ? { durationMinutes } : {})
    });
    return true;
  }

  // ────── ,kiss ─────────────────────────────────────────────────────────────
  if (content.toLowerCase().startsWith(",kiss")) {
    let targetUser = message.mentions.users.first() ?? null;
    let targetMember: GuildMember | null = null;

    // إذا كان رد على رسالة، استخدم صاحب الرسالة المرد عليها
    if (!targetUser && message.reference?.messageId) {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMsg && !refMsg.author.bot) targetUser = refMsg.author;
    }

    // محاولة جلب بالـ ID من النص
    if (!targetUser) {
      const rawId = content.slice(5).trim().split(/\s+/).find((a) => /^\d{17,19}$/.test(a.replace(/[<@!>]/g, "")))?.replace(/[<@!>]/g, "");
      if (rawId) {
        try {
          const fetched = await message.client.users.fetch(rawId);
          if (fetched && !fetched.bot) targetUser = fetched;
        } catch {}
      }
    }

    if (!targetUser) {
      await message.reply("منشن شخص أو رد على رسالته لترسل له قبلة. مثال: `,kiss @شخص`");
      return true;
    }

    if (targetUser.id === message.author.id) {
      await message.reply("لا يمكنك إرسال قبلة لنفسك!");
      return true;
    }

    // جلب gif من waifu.pics
    let gifUrl: string | null = null;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/kiss", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        gifUrl = data.url ?? null;
      }
    } catch {}
    // fallback لـ nekos.life
    if (!gifUrl) {
      try {
        const res2 = await fetch("https://nekos.life/api/v2/img/kiss", { signal: AbortSignal.timeout(5000) });
        if (res2.ok) {
          const data2 = (await res2.json()) as { url?: string };
          gifUrl = data2.url ?? null;
        }
      } catch {}
    }

    if (!gifUrl) {
      await message.reply("فشل جلب صورة القبلة، حاول مرة أخرى.");
      return true;
    }

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setDescription(`**${message.author.toString()}** kissing **${targetUser.toString()}**`)
      .setImage(gifUrl)
      .setFooter({ text: `${message.author.tag} → ${targetUser.tag}` });

    const ch = message.channel as any;
    if (ch?.isTextBased?.() || ch?.send) {
      await ch.send({ content: `${message.author.toString()} ${targetUser.toString()}`, embeds: [embed] }).catch(() => null);
    }
    return true;
  }

  // ────── ,slap ─────────────────────────────────────────────────────────────
  if (content.toLowerCase().startsWith(",slap")) {
    let targetUser = message.mentions.users.first() ?? null;
    if (!targetUser && message.reference?.messageId) {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMsg && !refMsg.author.bot) targetUser = refMsg.author;
    }
    if (!targetUser) {
      const rawId = content.slice(5).trim().split(/\s+/).find((a) => /^\d{17,19}$/.test(a.replace(/[<@!>]/g, "")))?.replace(/[<@!>]/g, "");
      if (rawId) {
        try {
          const fetched = await message.client.users.fetch(rawId);
          if (fetched && !fetched.bot) targetUser = fetched;
        } catch {}
      }
    }
    if (!targetUser) {
      await message.reply("منشن شخص أو رد على رسالته. مثال: `,slap @شخص`");
      return true;
    }
    if (targetUser.id === message.author.id) {
      await message.reply("لا يمكنك ضرب نفسك!");
      return true;
    }
    let gifUrl: string | null = null;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/slap", { signal: AbortSignal.timeout(5000) });
      if (res.ok) gifUrl = ((await res.json()) as any).url ?? null;
    } catch {}
    if (!gifUrl) {
      try {
        const res2 = await fetch("https://nekos.life/api/v2/img/slap", { signal: AbortSignal.timeout(5000) });
        if (res2.ok) gifUrl = ((await res2.json()) as any).url ?? null;
      } catch {}
    }
    if (!gifUrl) {
      await message.reply("فشل جلب الصورة، حاول مرة أخرى.");
      return true;
    }
    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setDescription(`**${message.author.toString()}** slapping **${targetUser.toString()}**`)
      .setImage(gifUrl)
      .setFooter({ text: `${message.author.tag} → ${targetUser.tag}` });
    const ch2 = message.channel as any;
    if (ch2?.isTextBased?.() || ch2?.send) {
      await ch2.send({ content: `${message.author.toString()} ${targetUser.toString()}`, embeds: [embed] }).catch(() => null);
    }
    return true;
  }

  // ────── ,hug ─────────────────────────────────────────────────────────────
  if (content.toLowerCase().startsWith(",hug")) {
    let targetUser = message.mentions.users.first() ?? null;
    if (!targetUser && message.reference?.messageId) {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMsg && !refMsg.author.bot) targetUser = refMsg.author;
    }
    if (!targetUser) {
      const rawId = content.slice(4).trim().split(/\s+/).find((a) => /^\d{17,19}$/.test(a.replace(/[<@!>]/g, "")))?.replace(/[<@!>]/g, "");
      if (rawId) {
        try {
          const fetched = await message.client.users.fetch(rawId);
          if (fetched && !fetched.bot) targetUser = fetched;
        } catch {}
      }
    }
    if (!targetUser) {
      await message.reply("منشن شخص أو رد على رسالته. مثال: `,hug @شخص`");
      return true;
    }
    if (targetUser.id === message.author.id) {
      await message.reply("لا يمكنك حضن نفسك!");
      return true;
    }
    let gifUrl: string | null = null;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/hug", { signal: AbortSignal.timeout(5000) });
      if (res.ok) gifUrl = ((await res.json()) as any).url ?? null;
    } catch {}
    if (!gifUrl) {
      try {
        const res2 = await fetch("https://nekos.life/api/v2/img/hug", { signal: AbortSignal.timeout(5000) });
        if (res2.ok) gifUrl = ((await res2.json()) as any).url ?? null;
      } catch {}
    }
    if (!gifUrl) {
      await message.reply("فشل جلب الصورة، حاول مرة أخرى.");
      return true;
    }
    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setDescription(`**${message.author.toString()}** hugging **${targetUser.toString()}**`)
      .setImage(gifUrl)
      .setFooter({ text: `${message.author.tag} → ${targetUser.tag}` });
    const ch3 = message.channel as any;
    if (ch3?.isTextBased?.() || ch3?.send) {
      await ch3.send({ content: `${message.author.toString()} ${targetUser.toString()}`, embeds: [embed] }).catch(() => null);
    }
    return true;
  }

  // ────── ,unjail ───────────────────────────────────────────────────────────
  if (content.startsWith(",unjail")) {
    const args = content.slice(7).trim().split(/\s+/);
    const targetId = args[0]?.replace(/[<@!>]/g, "");

    if (!targetId) {
      await message.reply("Please specify a user to unjail.");
      return true;
    }

    const targetMember = await message.guild!.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await message.reply("User not found.");
      return true;
    }

    if (!message.member?.permissions.has("Administrator")) {
      await message.reply("Only administrators can use this command.");
      return true;
    }

    if (targetMember.id === message.author.id) {
      await message.reply("You cannot unjail yourself.");
      return true;
    }

    if (targetMember.id === message.guild!.ownerId) {
      await message.reply("You cannot unjail the server owner.");
      return true;
    }

    if (
      message.guild!.ownerId !== message.author.id &&
      targetMember.roles.highest.position >= message.member!.roles.highest.position
    ) {
      await message.reply("You cannot unjail a member with an equal or higher role than yours.");
      return true;
    }

    if (targetMember.permissions.has("Administrator")) {
      await message.reply("Cannot unjail administrators.");
      return true;
    }

    if (!targetMember.manageable) {
      await message.reply("I do not have permission to unjail this member (role hierarchy).");
      return true;
    }

    const gConfig = await getGuildConfig(client, message.guild!.id);
    if (!gConfig.jail?.enabled || !gConfig.jail.roleId) {
      await message.reply("Jail system is not configured.");
      return true;
    }

    const jailRole = message.guild!.roles.cache.get(gConfig.jail.roleId);
    if (!jailRole) {
      await message.reply("Jail role not found.");
      return true;
    }

    const jailRecord = await JailUser.findOne({ userId: targetId, guildId: message.guild!.id });
    if (!jailRecord) {
      await message.reply("User is not jailed.");
      return true;
    }

    await releaseJailedMember(message.guild!, gConfig, jailRecord, targetMember);

    await JailUser.deleteOne({ userId: targetId, guildId: message.guild!.id });
    await message.reply(`Successfully unjailed ${targetMember.user.tag}.`);

    await recordModerationLog({
      guildId: message.guild!.id,
      userId: targetId,
      moderatorId: message.author.id,
      action: "unjail",
      reason: "prefix unjail"
    });
    return true;
  }

  return false;
}
