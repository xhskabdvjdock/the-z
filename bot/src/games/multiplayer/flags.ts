import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";
import { COUNTRIES, Country, randomCountry } from "../data/countries";

const MAX_ROUNDS = 10;
const ROUND_TIME = 20_000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextRoundData(): {
  country: Country;
  options: Country[];
  correct: string;
  answered: Record<string, boolean>;
} {
  const country = randomCountry();
  const others = shuffle(
    COUNTRIES.filter((c) => c.name !== country.name)
  ).slice(0, 3);
  const options = shuffle([country, ...others]);
  return {
    country,
    options,
    correct: country.name,
    answered: {}
  };
}

const def: GameDefinition<{
  current: ReturnType<typeof nextRoundData>;
  maxRounds: number;
}> = {
  name: "flags",
  aliases: ["flag", "الأعلام", "a3lam"],
  title: "الأعلام",
  description: "خمّن الدولة من العلم — 10 جولات وأعلى نقاط يفوز.",
  instructions:
    "يُعرض علم لدولة ويظهر أمامك 4 خيارات.\n" +
    "أول لاعب يختار الإجابة الصحيحة يكسب نقطة.\n" +
    "تستمر الجولة 20 ثانية ثم تنتقل تلقائيًا.\n" +
    "الأعلى نقاطًا بعد 10 جولات يفوز.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 8,
  durationLabel: "3-4 دقائق",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { current: nextRoundData(), maxRounds: MAX_ROUNDS };
    session.phase = "playing";
    session.round = 1;
    scheduleRound(session);
  },

  onAction(session, action) {
    if (action.type !== "flag") return;
    const data = session.gameData;
    const player = session.getPlayer(action.playerId);
    if (!player) return;
    if (data.current.answered[action.playerId]) return;

    if (action.value === data.current.correct) {
      player.score += 1;
      data.current.answered[action.playerId] = true;
      session.notify(
        `<@${action.playerId}> أصاب! الدولة هي **${data.current.country.name}** — النتيجة: ${scoresText(session)}`
      );
      advance(session);
    } else {
      data.current.answered[action.playerId] = true;
      session.notify(`خطأ يا <@${action.playerId}> — جرب مجددًا!`);
    }
  },

  render(session) {
    const data = session.gameData;
    const embed = new EmbedBuilder()
      .setTitle("الأعلام")
      .setDescription(
        `الجولة ${session.round}/${data.maxRounds}\n\n` +
          `ما الدولة صاحبة هذا العلم؟\n${data.current.country.flag}`
      )
      .addFields({
        name: "النتيجة",
        value: scoresText(session),
        inline: false
      });

    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const opt of data.current.options) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`game:${session.id}:flag:${opt.name}`)
          .setLabel(opt.name)
          .setStyle(ButtonStyle.Primary)
      );
    }
    return { embeds: [embed], rows: [row] };
  }
};

function advance(session: any): void {
  const data = session.gameData;
  session.clearTimer("round");
  if (session.round >= data.maxRounds) {
    const sorted = [...session.players].sort((a, b) => b.score - a.score);
    const top = sorted.filter((p) => p.score === sorted[0]?.score);
    session.finish({
      winners: top.length === 1 ? [top[0].id] : [],
      draw: top.length > 1,
      scores: Object.fromEntries(session.players.map((p: any) => [p.id, p.score])),
      summary: top.length === 1 ? `<@${top[0].id}> فاز في لعبة الأعلام!` : "تعادل في لعبة الأعلام."
    });
    return;
  }
  session.round += 1;
  data.current = nextRoundData();
  session.renderNow().catch(() => null);
  scheduleRound(session);
}

function scheduleRound(session: any): void {
  session.setTimer("round", ROUND_TIME, () => {
    if (session.status !== "PLAYING") return;
    session.notify("انتهت مهلة الجولة — لا نقاط.").catch(() => null);
    advance(session);
  });
}

function scoresText(session: any): string {
  return session.players.map((p: any) => `<@${p.id}>: ${p.score}`).join(" — ");
}

export default def;