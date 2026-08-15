import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction
} from "discord.js";
import { ExtendedClient } from "../client";
import { config } from "../config";
import { registry } from "./core/registry";
import { GameDefinition } from "./core/types";
import { sessionManager } from "./core/engine";
import { getLeaderboard, LeaderboardScope } from "./stats/leaderboard";
import { getPlayerAllStats } from "./stats/stats";

const PAGE_SIZE = 4;

const CATEGORY_LABELS: Record<string, string> = {
  all: "كل الألعاب",
  multiplayer: "ألعاب جماعية",
  singleplayer: "ألعاب فردية"
};

const SCOPE_LABELS: Record<LeaderboardScope, string> = {
  global: "كل السيرفرات",
  server: "هذا السيرفر",
  weekly: "هذا الأسبوع",
  monthly: "هذا الشهر"
};

/* ─────────────── بناء الإيمبدات ─────────────── */

function gameFields(embed: EmbedBuilder, game: GameDefinition): void {
  embed.addFields(
    { name: "الفئة", value: game.category === "multiplayer" ? "جماعية" : "فردية", inline: true },
    { name: "اللاعبون", value: `${game.minPlayers} - ${game.maxPlayers}`, inline: true },
    { name: "المدة", value: game.durationLabel, inline: true },
    { name: "الأمر", value: `\`-${game.name}\``, inline: true }
  );
  if (game.supportsCrossGuild) {
    embed.addFields({ name: "Cross-Guild", value: "متاح", inline: true });
  }
}

export function homeEmbed(): EmbedBuilder {
  const multiplayer = registry.byCategory("multiplayer").length;
  const single = registry.byCategory("singleplayer").length;
  return new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle("The Z Games — مركز الألعاب")
    .setDescription(
      "مرحبًا بك في مركز الألعاب.\n" +
        "استعرض الألعاب، تحقق من لوائح المتصدرين، وإحصاءاتك، والجلسات النشطة.\n\n" +
        "**للعب**: استخدم البادئة مع اسم اللعبة (مثال: \`-xo\`، \`-mafia\`، \`-trivia\`).\n" +
        "هذا المركز مخصص للعرض والاستكشاف فقط."
    )
    .addFields(
      { name: "الألعاب الجماعية", value: `${multiplayer} لعبة`, inline: true },
      { name: "الألعاب الفردية", value: `${single} لعبة`, inline: true },
      { name: "الجلسات النشطة الآن", value: `${sessionManager.activeCount()}`, inline: true }
    )
    .setFooter({ text: "The Z Games" });
}

export function browseEmbed(category: string, page: number): { embed: EmbedBuilder; totalPages: number } {
  const games =
    category === "all" ? registry.all() : registry.byCategory(category as "multiplayer" | "singleplayer");
  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = games.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(`الألعاب — ${CATEGORY_LABELS[category] ?? category}`)
    .setDescription(`الصفحة ${safePage + 1} من ${totalPages}`);

  for (const game of slice) {
    embed.addFields({
      name: `${game.title} (${game.name})`,
      value: `${game.description}\nاللاعبون: ${game.minPlayers}-${game.maxPlayers} — الأمر: \`-${game.name}\``,
      inline: false
    });
  }

  if (!games.length) embed.setDescription("لا توجد ألعاب في هذه الفئة.");

  return { embed, totalPages };
}

export function gameDetailEmbed(game: GameDefinition): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(game.title)
    .setDescription(`${game.description}\n\n**طريقة اللعب**\n${game.instructions}`);
  gameFields(embed, game);
  if (game.aliases.length) {
    embed.addFields({ name: "أسماء مستعارة", value: game.aliases.map((a) => `\`${a}\``).join("، "), inline: false });
  }
  return embed;
}

export async function leaderboardEmbed(
  client: ExtendedClient,
  guild: Guild,
  scope: LeaderboardScope,
  gameName: string,
  page: number
): Promise<{ embed: EmbedBuilder; totalPages: number }> {
  const allGames = gameName === "all" ? undefined : gameName;
  const limit = 10;
  const entries = await getLeaderboard({
    gameName: allGames,
    guildId: scope === "server" ? guild.id : undefined,
    scope,
    limit: 500
  });

  const totalPages = Math.max(1, Math.ceil(entries.length / limit));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = entries.slice(safePage * limit, safePage * limit + limit);

  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(
      `لوائح المتصدرين — ${SCOPE_LABELS[scope]}${allGames ? ` — ${allGames}` : ""}`
    )
    .setDescription(
      scope === "weekly"
        ? "نقاط الأسبوع الحالي"
        : scope === "monthly"
          ? "نقاط الشهر الحالي"
          : "نقاط الموسم"
    );

  if (!slice.length) {
    embed.setDescription("لا توجد نتائج بعد — العب أول مباراة لتظهر إحصاءاتك.");
  }

  const names = new Map<string, string>();
  for (const e of slice) {
    if (names.has(e.userId)) continue;
    const m = await guild.members.fetch(e.userId).catch(() => null);
    names.set(e.userId, m?.displayName ?? `عضو (${e.userId.slice(0, 6)})`);
  }

  const lines = slice.map(
    (e, i) =>
      `${e.rank + safePage * limit}. **${names.get(e.userId) ?? e.userId}** — ${e.metricValue} نقطة (فوز ${e.wins})`
  );
  embed.setDescription(embed.data.description + "\n\n" + lines.join("\n"));

  return { embed, totalPages };
}

export async function myStatsEmbed(client: ExtendedClient, guild: Guild, userId: string): Promise<EmbedBuilder> {
  const stats = await getPlayerAllStats(guild.id, userId);
  const member = await guild.members.fetch(userId).catch(() => null);
  const name = member?.displayName ?? "أنت";

  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(`إحصاءات ${name}`)
    .setDescription(stats ? "إجمالي إحصاءاتك في ألعاب هذا السيرفر" : "لا توجد إحصاءات بعد.");

  if (stats) {
    embed.addFields(
      { name: "المباريات", value: `${stats.gamesPlayed}`, inline: true },
      { name: "الانتصارات", value: `${stats.wins}`, inline: true },
      { name: "الهزائم", value: `${stats.losses}`, inline: true },
      { name: "التعادلات", value: `${stats.draws}`, inline: true },
      { name: "النقاط الموسمية", value: `${stats.points}`, inline: true },
      { name: "أفضل نتيجة", value: `${stats.bestScore}`, inline: true },
      { name: "أطول سلسلة فوز", value: `${stats.maxStreak}`, inline: true }
    );
    if (stats.games.length) {
      embed.addFields({
        name: "الألعاب التي لعبتها",
        value: stats.games.map((g) => `\`${g}\``).join("، "),
        inline: false
      });
    }
  }
  return embed;
}

export function activeGamesEmbed(): EmbedBuilder {
  const sessions = sessionManager.list();
  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle("الجلسات النشطة")
    .setDescription(sessions.length ? `${sessions.length} جلسة نشطة الآن.` : "لا توجد جلسات نشطة الآن.");

  for (const s of sessions.slice(0, 15)) {
    const host = s.players[0]?.id ?? s.hostId;
    embed.addFields({
      name: `${s.def.title} — <#${s.channelId}>`,
      value: `اللاعبون: ${s.players.length}/${s.def.maxPlayers} — المضيف: <@${host}> — الحالة: ${s.status}`,
      inline: false
    });
  }
  return embed;
}

/* ─────────────── الصفوف (الأزرار/القوائم) ─────────────── */

export function homeRows(): ActionRowBuilder<any>[] {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId("gamec:browse:all:0").setLabel("الألعاب").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("gamec:board:global:all:0").setLabel("لوائح المتصدرين").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("gamec:stats").setLabel("إحصاءاتي").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("gamec:active").setLabel("جلسات نشطة").setStyle(ButtonStyle.Secondary)
    );
  return [row];
}

export function browseRows(category: string, page: number, totalPages: number): ActionRowBuilder<any>[] {
  const cat = new StringSelectMenuBuilder()
    .setCustomId("gamec:cat")
    .setPlaceholder("تصفية حسب الفئة")
    .addOptions(
      { label: "كل الألعاب", value: "all" },
      { label: "ألعاب جماعية", value: "multiplayer" },
      { label: "ألعاب فردية", value: "singleplayer" }
    );
  const nav = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`gamec:browse:${category}:${page - 1}`)
        .setLabel("السابق")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`gamec:browse:${category}:${page + 1}`)
        .setLabel("التالي")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder().setCustomId("gamec:home").setLabel("الرئيسية").setStyle(ButtonStyle.Danger)
    );
  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cat), nav];
}

export function detailRows(gameName: string): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId("gamec:back").setLabel("رجوع").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`gamec:board:server:${gameName}:0`)
        .setLabel("لوائح هذه اللعبة")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("gamec:home").setLabel("الرئيسية").setStyle(ButtonStyle.Danger)
    );
  return [row];
}

export function leaderboardRows(
  scope: LeaderboardScope,
  gameName: string,
  page: number,
  totalPages: number
): ActionRowBuilder<any>[] {
  const select = new StringSelectMenuBuilder()
    .setCustomId("gamec:scope")
    .setPlaceholder("نطاق اللائحة")
    .addOptions(
      { label: "كل السيرفرات", value: "global" },
      { label: "هذا السيرفر", value: "server" },
      { label: "هذا الأسبوع", value: "weekly" },
      { label: "هذا الشهر", value: "monthly" }
    );
  const gameSel = new StringSelectMenuBuilder()
    .setCustomId("gamec:boardgame")
    .setPlaceholder("اللعبة")
    .addOptions([{ label: "كل الألعاب", value: "all" }, ...registry.all().map((g) => ({ label: g.title, value: g.name }))]);
  const nav = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`gamec:board:${scope}:${gameName}:${page - 1}`)
        .setLabel("السابق")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`gamec:board:${scope}:${gameName}:${page + 1}`)
        .setLabel("التالي")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder().setCustomId("gamec:home").setLabel("الرئيسية").setStyle(ButtonStyle.Danger)
    );
  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gameSel),
    nav
  ];
}

export function statsRows(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("gamec:board:server:all:0").setLabel("لوائح السيرفر").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("gamec:home").setLabel("الرئيسية").setStyle(ButtonStyle.Danger)
    )
  ];
}

/* ─────────────── توزيع التفاعلات ─────────────── */

export function registerGameCenter(router: {
  registerButton: (prefix: string, handler: (i: ButtonInteraction, c: ExtendedClient) => Promise<void>) => void;
  registerSelect: (prefix: string, handler: (i: StringSelectMenuInteraction, c: ExtendedClient) => Promise<void>) => void;
}) {
  router.registerButton("gamec:", async (i, client) => handleCenterButton(i, client));
  router.registerSelect("gamec:", async (i, client) => handleCenterSelect(i, client));
}

async function update(interaction: ButtonInteraction | StringSelectMenuInteraction, payload: any): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload).catch(() => null);
  } else {
    await interaction.update(payload).catch(() => null);
  }
}

async function handleCenterButton(interaction: ButtonInteraction, client: ExtendedClient): Promise<void> {
  const parts = interaction.customId.split(":");
  const kind = parts[1];

  if (kind === "browse") {
    const cat = parts[2] ?? "all";
    const page = Number(parts[3] ?? 0);
    const { embed, totalPages } = browseEmbed(cat, page);
    await update(interaction, { embeds: [embed], components: browseRows(cat, page, totalPages) });
    return;
  }

  if (kind === "detail") {
    const game = registry.get(parts[2] ?? "");
    if (!game) return;
    await update(interaction, { embeds: [gameDetailEmbed(game)], components: detailRows(game.name) });
    return;
  }

  if (kind === "board") {
    const scope = parts[2] as LeaderboardScope;
    const gameName = parts[3] ?? "all";
    const page = Number(parts[4] ?? 0);
    const { embed, totalPages } = await leaderboardEmbed(client, interaction.guild!, scope, gameName, page);
    await update(interaction, {
      embeds: [embed],
      components: leaderboardRows(scope, gameName, page, totalPages)
    });
    return;
  }

  if (kind === "stats") {
    const embed = await myStatsEmbed(client, interaction.guild!, interaction.user.id);
    await update(interaction, { embeds: [embed], components: statsRows() });
    return;
  }

  if (kind === "active") {
    await update(interaction, {
      embeds: [activeGamesEmbed()],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("gamec:home").setLabel("الرئيسية").setStyle(ButtonStyle.Danger)
        )
      ]
    });
    return;
  }

  if (kind === "back" || kind === "home") {
    await update(interaction, { embeds: [homeEmbed()], components: homeRows() });
    return;
  }
}

async function handleCenterSelect(interaction: StringSelectMenuInteraction, client: ExtendedClient): Promise<void> {
  const parts = interaction.customId.split(":");
  const kind = parts[1];
  const value = interaction.values[0];

  if (kind === "cat") {
    const { embed, totalPages } = browseEmbed(value, 0);
    await update(interaction, { embeds: [embed], components: browseRows(value, 0, totalPages) });
    return;
  }

  if (kind === "scope") {
    const { embed, totalPages } = await leaderboardEmbed(client, interaction.guild!, value as LeaderboardScope, "all", 0);
    await update(interaction, {
      embeds: [embed],
      components: leaderboardRows(value as LeaderboardScope, "all", 0, totalPages)
    });
    return;
  }

  if (kind === "boardgame") {
    const { embed, totalPages } = await leaderboardEmbed(client, interaction.guild!, "server", value, 0);
    await update(interaction, {
      embeds: [embed],
      components: leaderboardRows("server", value, 0, totalPages)
    });
    return;
  }
}