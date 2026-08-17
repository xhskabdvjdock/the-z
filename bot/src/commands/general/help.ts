import { EmbedBuilder, PermissionsBitField } from "discord.js";
import { BotCommand, CommandOptionType } from "../../types/command";
import { ExtendedClient } from "../../client";
import { config } from "../../config";
import { getGuildConfig } from "../../utils/guildConfig";

const CATEGORY_ORDER = ["عام", "إشراف", "تذاكر", "رومات صوتية", "مستويات", "رولات", "أدوات"];

const CATEGORY_ICONS: Record<string, string> = {
  "عام": "📌",
  "إشراف": "🛡️",
  "تذاكر": "🎫",
  "رومات صوتية": "🎙️",
  "مستويات": "🆙",
  "رولات": "🎨",
  "أدوات": "🎞️"
};

/** أوامر البادئة الثابتة (لا تُسجَّل كأوامر Slash) */
const PREFIX_ONLY: { cmd: string; desc: string }[] = [
  { cmd: ",tr", desc: "ترجمة رسالة إلى العربية/الإنجليزية (رد على الرسالة)" },
  { cmd: ",afk", desc: "ضبط حالة عدم التوفر مع سبب اختياري" },
  { cmd: ",avatar", desc: "عرض صورة مستخدم (أو `server` لصورة السيرفر)" },
  { cmd: ",banner", desc: "عرض بانر المستخدم أو السيرفر" },
  { cmd: ",jail", desc: "سجن عضو مؤقتًا (للمشرفين فقط)" },
  { cmd: ",unjail", desc: "الإفراج عن عضو مسجون (للمشرفين فقط)" }
];

const OPTION_TYPE_LABELS: Record<CommandOptionType, string> = {
  user: "مستخدم",
  string: "نص",
  integer: "رقم صحيح",
  number: "رقم",
  channel: "قناة",
  role: "رتبة",
  boolean: "نعم/لا",
  attachment: "ملف"
};

function optionTypeLabel(type: CommandOptionType): string {
  return OPTION_TYPE_LABELS[type] ?? type;
}

async function buildOverviewEmbed(client: ExtendedClient, guildId: string): Promise<EmbedBuilder> {
  const groups = new Map<string, BotCommand[]>();
  for (const cmd of client.commands.values()) {
    const list = groups.get(cmd.category) ?? [];
    list.push(cmd);
    groups.set(cmd.category, list);
  }

  const categories = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c))
  ];

  const gConfig = await getGuildConfig(client, guildId);
  const prefix = gConfig.prefix || "!";
  const total = client.commands.size;

  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle("📖 قائمة أوامر The Z")
    .setDescription(
      `**${total} أمر** متاح عبر Slash Commands والبادئة النصية للسيرفر.\n` +
        `مثال: \`/ping\` أو \`${prefix}ping\`.\n` +
        "لعرض تفاصيل أمر معين استخدم: `/help <command>`."
    )
    .setFooter({ text: "The Z — بوت إداري متكامل + لوحة تحكم ويب" });

  for (const cat of categories) {
    const list = groups.get(cat) ?? [];
    const lines = list
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => `**\`/${c.name}\`** — ${c.description}`);
    embed.addFields({ name: `${CATEGORY_ICONS[cat] ?? "📂"} ${cat}`, value: lines.join("\n") });
  }

  embed.addFields({
    name: "⚡ أوامر البادئة السريعة",
    value: PREFIX_ONLY.map((p) => `\`${p.cmd}\` — ${p.desc}`).join("\n")
  });

  return embed;
}

function buildCommandDetailEmbed(command: BotCommand): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(`/${command.name}`)
    .setDescription(command.description || "لا يوجد وصف.");

  embed.addFields(
    { name: "الفئة", value: command.category, inline: true },
    {
      name: "نوع التنفيذ",
      value: command.dmEnabled
        ? "Slash + بادئة السيرفر + الرسائل الخاصة (DM)"
        : "Slash + بادئة السيرفر",
      inline: true
    }
  );

  if (command.cooldownSeconds && command.cooldownSeconds > 0) {
    embed.addFields({ name: "البرودة", value: `${command.cooldownSeconds} ثانية`, inline: true });
  }

  if (command.defaultMemberPermissions !== undefined) {
    const perms = new PermissionsBitField(command.defaultMemberPermissions);
    embed.addFields({
      name: "الصلاحيات",
      value: perms.has("Administrator") ? "إدارة السيرفر (Administrator)" : "حسب صلاحيات Discord للرتب",
      inline: true
    });
  }

  if (command.options?.length) {
    const lines = command.options.map(
      (o) =>
        `\`${o.name}\` — ${o.description}${o.required ? " **(مطلوب)**" : ""} (${optionTypeLabel(o.type)})` +
        (o.choices?.length ? ` — الخيارات: ${o.choices.map((c) => c.name).join("، ")}` : "")
    );
    embed.addFields({ name: "المعاملات", value: lines.join("\n") });
  } else {
    embed.addFields({ name: "المعاملات", value: "بدون معاملات." });
  }

  return embed;
}

const command: BotCommand = {
  name: "help",
  description: "عرض قائمة الأوامر المتاحة أو تفاصيل أمر معين",
  category: "عام",
  options: [
    {
      name: "command",
      description: "اسم الأمر لعرض تفاصيله (اختياري)",
      type: "string",
      required: false
    }
  ],
  async run(ctx) {
    const query = ctx.getString("command")?.trim().toLowerCase();

    if (query) {
      const target =
        ctx.client.commands.get(query) ??
        ctx.client.commands.find((c) => c.name.toLowerCase() === query);

      if (!target) {
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("الأمر غير موجود")
              .setDescription(
                `لم أجد أمرًا باسم \`${query}\`.\nاستخدم \`/help\` لعرض قائمة الأوامر الكاملة.`
              )
          ]
        });
        return;
      }

      await ctx.reply({ embeds: [buildCommandDetailEmbed(target)] });
      return;
    }

    await ctx.reply({ embeds: [await buildOverviewEmbed(ctx.client, ctx.guild.id)] });
  }
};

export default command;