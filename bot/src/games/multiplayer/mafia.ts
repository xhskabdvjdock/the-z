import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

type Role = "mafia" | "detective" | "doctor" | "civilian";

const NIGHT_TIME = 45_000;
const DAY_TIME = 60_000;

interface MafiaData {
  roles: Record<string, Role>;
  mafiaIds: string[];
  detectiveId: string | null;
  doctorId: string | null;
  nightVotes: Record<string, string>;
  dayVotes: Record<string, string>;
  nightActors: string[];
  dayCount: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignRoles(players: string[]): Record<string, Role> {
  const roles: Record<string, Role> = {};
  const n = players.length;
  let mafiaCount = n <= 7 ? 1 : n <= 12 ? 2 : 3;
  mafiaCount = Math.min(mafiaCount, Math.floor((n - 1) / 2));
  const pool = [
    ...Array(mafiaCount).fill("mafia" as Role),
    "detective",
    "doctor",
    ...Array(n - mafiaCount - 2).fill("civilian" as Role)
  ];
  const shuffled = shuffle(pool);
  players.forEach((p, i) => (roles[p] = shuffled[i]));
  return roles;
}

function alivePlayers(session: GameSession): string[] {
  return session.players.filter((p) => p.alive).map((p) => p.id);
}

function selectRow(
  session: GameSession,
  options: string[],
  placeholder: string,
  action: string
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`game:${session.id}:${action}`)
    .setPlaceholder(placeholder)
    .addOptions(
      options.map((id) => {
        const p = session.getPlayer(id);
        return { label: p?.username ?? "لاعب", value: id };
      })
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

const def: GameDefinition<MafiaData> = {
  name: "mafia",
  aliases: ["مافيا"],
  title: "المافيا",
  description: "لعبة الغموض والتحالفات — المافيا تقتل بالليل، والمدينة تحقق بالنهار.",
  instructions:
    "تُوزَّع الأدوار سرًا: مافيا، محقق، طبيب، وأهالي.\n" +
    "بالليل: تقتل المافيا ضحية عبر رسالة خاصة، وينقذ الطبيب، ويحقق المحقق.\n" +
    "بالنهار: يصوّت الجميع لإعدام مشتبه به.\n" +
    "تنتهي عندما تُصفّى المافيا (فوز المدينة) أو تسيطر (فوز المافيا).",
  category: "multiplayer",
  minPlayers: 5,
  maxPlayers: 15,
  durationLabel: "10-20 دقيقة",
  cooldownSeconds: 30,

  onStart(session) {
    const ids = session.players.map((p) => p.id);
    const roles = assignRoles(ids);
    const mafiaIds = ids.filter((i) => roles[i] === "mafia");
    const data: MafiaData = {
      roles,
      mafiaIds,
      detectiveId: ids.find((i) => roles[i] === "detective") ?? null,
      doctorId: ids.find((i) => roles[i] === "doctor") ?? null,
      nightVotes: {},
      dayVotes: {},
      nightActors: [],
      dayCount: 1
    };
    session.gameData = data;
    session.phase = "night";

    // إرسال الأدوار سرًا
    for (const p of session.players) {
      const role = roles[p.id];
      const roleName =
        role === "mafia" ? "مافيا" : role === "detective" ? "محقق" : role === "doctor" ? "طبيب" : "أهالي";
      const desc =
        role === "mafia"
          ? `أنت من المافيا. الزملاء: ${mafiaIds
              .filter((m) => m !== p.id)
              .map((m) => `<@${m}>`)
              .join("، ") || "لا أحد"}.`
          : role === "detective"
            ? "تحقّق كل ليلة من لاعب لتعرف إن كان مافيا."
            : role === "doctor"
              ? "أنقذ لاعبًا كل ليلة من رصاصة المافيا."
              : "أنت من الأهالي — صوّت بحكمة بالنهار.";
      session.dm(p.id, [
        new EmbedBuilder()
          .setColor(0x2c3e50)
          .setTitle(`دورك في المافيا: ${roleName}`)
          .setDescription(desc)
      ]).catch(() => null);
    }

    session.setTurn(null);
    void runMafia(session);
  },

  onAction(session, action) {
    const data = session.gameData as MafiaData;
    const actor = session.getPlayer(action.playerId);
    if (!actor || !actor.alive) return;

    // تصويت نهاري
    if (action.type === "vote") {
      if (session.phase !== "day") return;
      if (data.dayVotes[action.playerId] != null) return;
      const target = session.getPlayer(action.value);
      if (!target || !target.alive || target.id === action.playerId) return;
      data.dayVotes[action.playerId] = action.value;
      return;
    }

    // إجراء ليلي (قادم من رسالة خاصة)
    if (session.phase !== "night") return;
    if (!data.nightActors.includes(action.playerId)) return;
    if (data.nightVotes[action.playerId] != null) return;

    const role = data.roles[action.playerId];
    if (action.type !== `night_${role}`) return;
    const target = session.getPlayer(action.value);
    if (!target || !target.alive || target.id === action.playerId) return;

    data.nightVotes[action.playerId] = action.value;

    // استعلام المحقق يعود فورًا
    if (role === "detective") {
      const isMafia = data.mafiaIds.includes(action.value);
      session.dm(action.playerId, [
        new EmbedBuilder()
          .setColor(isMafia ? 0xe74c3c : 0x2ecc71)
          .setTitle("نتيجة التحقيق")
          .setDescription(
            isMafia ? "هذا اللاعب **من المافيا**." : "هذا اللاعب **ليس** من المافيا."
          )
      ]).catch(() => null);
    }

    // كل الأدوار الليلية صوتت؟
    const allActed = data.nightActors.every((a) => data.nightVotes[a] != null);
    if (allActed) {
      void resolveNight(session);
    }
  },

  render(session) {
    const data = session.gameData as MafiaData;
    const alive = alivePlayers(session);
    const embed = new EmbedBuilder()
      .setColor(session.phase === "night" ? 0x34495e : 0xf39c12)
      .setTitle(session.phase === "night" ? "المافيا — الليل" : "المافيا — النهار")
      .setDescription(
        session.phase === "night"
          ? "جاء الليل... الأدوار الليلية اختارت أهدافها عبر رسالة خاصة."
          : `اليوم ${data.dayCount} — صوّتوا لإعدام مشتبه به.`
      )
      .addFields(
        {
          name: "الأحياء",
          value: alive.map((id) => `<@${id}>`).join("، ") || "لا أحد",
          inline: false
        },
        {
          name: "المافيا المتبقية",
          value: `${data.mafiaIds.filter((m) => session.getPlayer(m)?.alive).length}`,
          inline: true
        }
      );

    const rows: ActionRowBuilder<any>[] = [];
    if (session.phase === "day") {
      const opts = alive.filter((id) => true); // الجميع يختار من الأحياء
      if (opts.length > 0) {
        rows.push(selectRow(session, opts, "اختر من تُعدَم", "vote"));
      }
    }
    return { embeds: [embed], rows };
  }
};

/* ─────────────── حلقة اللعبة ─────────────── */

async function runMafia(session: GameSession): Promise<void> {
  await session.renderNow();
  await nightPhase(session);
}

async function nightPhase(session: GameSession): Promise<void> {
  const data = session.gameData as MafiaData;
  session.phase = "night";
  data.nightVotes = {};
  data.nightActors = [];

  const alive = alivePlayers(session);
  const mafiaAlive = data.mafiaIds.filter((m) => session.getPlayer(m)?.alive);
  data.nightActors.push(...mafiaAlive);
  if (data.detectiveId && session.getPlayer(data.detectiveId)?.alive) {
    data.nightActors.push(data.detectiveId);
  }
  if (data.doctorId && session.getPlayer(data.doctorId)?.alive) {
    data.nightActors.push(data.doctorId);
  }

  // أرسل خيارات الأدوار الليلية
  for (const actorId of data.nightActors) {
    const role = data.roles[actorId];
    const targets = alive.filter((t) => t !== actorId);
    if (role === "mafia") {
      const townTargets = targets.filter((t) => !data.mafiaIds.includes(t));
      if (townTargets.length) {
        session.dm(actorId, [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("اختر ضحية الليلة")
            .setDescription("اختر لاعبًا من المدينة لإسقاطه.")
        ], [selectRow(session, townTargets, "الضحية الليلة", `night_mafia`)]).catch(() => null);
      }
    } else if (role === "detective") {
      session.dm(actorId, [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("تحقيق")
          .setDescription("اختر لاعبًا لتعرف إن كان مافيا.")
      ], [selectRow(session, targets, "لاعب للتحقيق", "night_detective")]).catch(() => null);
    } else if (role === "doctor") {
      session.dm(actorId, [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("حماية")
          .setDescription("اختر لاعبًا لإنقاذه الليلة.")
      ], [selectRow(session, targets, "لاعب للحماية", "night_doctor")]).catch(() => null);
    }
  }

  session.setTimer("night", NIGHT_TIME, () => {
    if (session.status !== "PLAYING") return;
    void resolveNight(session, true);
  });
}

async function resolveNight(session: GameSession, forced = false): Promise<void> {
  const data = session.gameData as MafiaData;
  session.clearTimer("night");
  if (session.status !== "PLAYING") return;

  // اختيار ضحية المافيا (أغلبية، وعشوائي عند التعادل)
  const mafiaVotes = data.mafiaIds
    .filter((m) => session.getPlayer(m)?.alive)
    .map((m) => data.nightVotes[m])
    .filter(Boolean);
  let target: string | null = null;
  if (mafiaVotes.length) {
    const counts = new Map<string, number>();
    for (const v of mafiaVotes) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best: string | null = null;
    let bestCount = 0;
    for (const [t, c] of counts) {
      if (c > bestCount) {
        best = t;
        bestCount = c;
      } else if (c === bestCount && Math.random() < 0.5) {
        best = t;
      }
    }
    target = best;
  }

  const saved = data.doctorId && data.nightVotes[data.doctorId]
    ? data.nightVotes[data.doctorId]
    : null;

  const killed = target && target !== saved ? target : null;

  if (killed) {
    const player = session.getPlayer(killed);
    if (player) {
      player.alive = false;
      player.score += 1;
    }
    await session.notify(`أُسقط اللاعب <@${killed}> خلال الليل.`).catch(() => null);
  } else if (saved) {
    await session.notify("الطبيب أنقذ أحد اللاعبين هذه الليلة.").catch(() => null);
  } else {
    await session.notify("هدوء تام... لم يُصب أحد الليلة.").catch(() => null);
  }

  // فحص النهاية
  if (await checkWin(session)) return;

  data.nightVotes = {};
  await dayPhase(session);
}

async function dayPhase(session: GameSession): Promise<void> {
  const data = session.gameData as MafiaData;
  session.phase = "day";
  data.dayVotes = {};
  await session.renderNow();

  session.setTimer("day", DAY_TIME, () => {
    if (session.status !== "PLAYING") return;
    void resolveLynch(session, true);
  });
}

async function resolveLynch(session: GameSession, forced = false): Promise<void> {
  const data = session.gameData as MafiaData;
  session.clearTimer("day");
  if (session.status !== "PLAYING") return;

  const votes = data.dayVotes;
  const counts = new Map<string, number>();
  for (const v of Object.values(votes)) counts.set(v, (counts.get(v) ?? 0) + 1);

  let target: string | null = null;
  let bestCount = 0;
  for (const [t, c] of counts) {
    if (c > bestCount) {
      target = t;
      bestCount = c;
    } else if (c === bestCount && Math.random() < 0.5) {
      target = t;
    }
  }

  if (target) {
    const player = session.getPlayer(target);
    if (player && player.alive) {
      player.alive = false;
      player.score += 1;
      await session.notify(`الأغلبية صوّتت — أُعدِم <@${target}> (${bestCount} صوتًا).`).catch(() => null);
    }
  } else {
    await session.notify("لم يُعدَم أحد اليوم.").catch(() => null);
  }

  data.dayCount += 1;
  if (await checkWin(session)) return;

  data.dayVotes = {};
  await nightPhase(session);
}

/** فحص نهاية اللعبة — يُنهي الجلسة عند الحسم */
async function checkWin(session: GameSession): Promise<boolean> {
  const data = session.gameData as MafiaData;
  const alive = alivePlayers(session);
  const mafiaAlive = data.mafiaIds.filter((m) => alive.includes(m));
  const townAlive = alive.filter((a) => !data.mafiaIds.includes(a));

  if (mafiaAlive.length === 0) {
    const scores: Record<string, number> = {};
    for (const p of session.players) scores[p.id] = p.alive ? 1 : 0.5;
    await session.finish({
      winners: townAlive,
      scores,
      summary: revealRoles(session) + "\n\n**فازت المدينة** — القضاء على المافيا!"
    });
    return true;
  }

  if (mafiaAlive.length >= townAlive.length) {
    const scores: Record<string, number> = {};
    for (const p of session.players) scores[p.id] = mafiaAlive.includes(p.id) ? 1 : 0;
    await session.finish({
      winners: mafiaAlive,
      scores,
      summary: revealRoles(session) + "\n\n**فازت المافيا** — سيطرت على المدينة!"
    });
    return true;
  }

  return false;
}

function revealRoles(session: GameSession): string {
  const data = session.gameData as MafiaData;
  const lines = session.players.map((p) => {
    const role = data.roles[p.id];
    const roleName =
      role === "mafia" ? "مافيا" : role === "detective" ? "محقق" : role === "doctor" ? "طبيب" : "أهالي";
    return `<@${p.id}>: ${roleName}${p.alive ? "" : " (خارج)"}`;
  });
  return `**الأدوار:**\n${lines.join("\n")}`;
}

export default def;