import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const TRUTHS = [
  "ما أكثر شيء تندم عليه؟",
  "لو غدًا آخر يوم في حياتك، ماذا ستفعل؟",
  "ما أغرب شيء فعلته وأنت صغير؟",
  "هل سبق أن كذبت على شخص مقرب؟",
  "ما الشيء الذي تخاف منه أكثر من غيره؟",
  "متى آخر مرة بكيت فيها؟",
  "هل تحب المهمات أم الحرية؟",
  "ما أفضل نصيحة تلقيتها في حياتك؟",
  "هل سبق أن أضمرت شيئًا لصديق؟",
  "ما عادتك السرية التي لا يعرفها أحد؟"
];

const DARES = [
  "قل جملة بالإنجليزية بصوت مسرحي.",
  "مثل صوت حيوان لمدة 10 ثوانٍ.",
  "ارقص على أنغام وهمية لمدة 15 ثانية.",
  "اكتب اسمك بالمقلوب في الشات.",
  "اروِ نكتة مضحكة الآن.",
  "تحدث بلهجة مختلفة في الجولة القادمة.",
  "أرسل رسالة (مرحبًا) لآخر شخص في قائمتك.",
  "قل: أنا أستحق الفوز بهذه اللعبة.",
  "حاول أن تضحك الآخرين بأي طريقة.",
  "قل جملة تتضمن اسم عضو آخر في اللعبة."
];

const ROUNDS_PER_PLAYER = 2;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const def: GameDefinition<{
  order: string[];
  index: number;
  roundsPerPlayer: number;
}> = {
  name: "truthordare",
  aliases: ["truth-or-dare", "tod", "حقيقة-أم-جرأة"],
  title: "حقيقة أم جرأة",
  description: "لعبة الأحاديث — اختر حقيقة أو جرأة وستظهر لك مفاجأة.",
  instructions:
    "يتناوب اللاعبون على اختيار (حقيقة) أو (جرأة).\n" +
    "سيختار البوت سؤالًا أو تحديًا عشوائيًا من قائمته.\n" +
    "الجولة تنتهي بعد إجابة كل لاعب مرتين.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 10,
  durationLabel: "5-10 دقائق",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = {
      order: shuffle(session.players.map((p) => p.id)),
      index: 0,
      roundsPerPlayer: ROUNDS_PER_PLAYER
    };
    session.phase = "playing";
    session.round = 1;
    session.setTurn(session.gameData.order[0]);
  },

  onAction(session, action) {
    if (action.type !== "pick") return;
    if (!session.isTurn(action.playerId)) return;

    const data = session.gameData;
    const player = session.getPlayer(action.playerId)!;
    const bank = action.value === "truth" ? TRUTHS : DARES;
    const item = bank[Math.floor(Math.random() * bank.length)];

    player.score += 1;
    player.data.answers = (player.data.answers ?? 0) + 1;

    const label = action.value === "truth" ? "حقيقة" : "جرأة";
    session.notify(`<@${action.playerId}> — **${label}**: ${item}`);

    // هل اكتملت جولات الجميع؟
    const allDone = session.players.every((p) => (p.data.answers ?? 0) >= data.roundsPerPlayer);
    if (allDone) {
      const scores = Object.fromEntries(session.players.map((p) => [p.id, p.score]));
      session.finish({
        winners: session.players.map((p) => p.id),
        scores,
        summary: "أكمل الجميع جولاتهم في حقيقة أم جرأة!"
      });
      return;
    }

    // اللاعب التالي الذي لم يكمل جولاته
    data.index += 1;
    const order = data.order;
    let next = (data.index) % order.length;
    while (
      (session.getPlayer(order[next])?.data.answers ?? 0) >= data.roundsPerPlayer
    ) {
      next = (next + 1) % order.length;
    }
    data.index = next;
    session.setTurn(order[next]);
    session.round += 1;
  },

  render(session) {
    const current = session.getPlayer(session.turnPlayerId ?? "");
    const embed = new EmbedBuilder()
      .setTitle("حقيقة أم جرأة")
      .setDescription(
        `الدور على: ${current ? `<@${current.id}>` : "—"}\n\n` +
          session.players
            .map((p) => `<@${p.id}>: أجاب ${p.data.answers ?? 0}/${session.gameData.roundsPerPlayer}`)
            .join("\n")
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:pick:truth`)
        .setLabel("حقيقة")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!session.isTurn(session.turnPlayerId ?? "")),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:pick:dare`)
        .setLabel("جرأة")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!session.isTurn(session.turnPlayerId ?? ""))
    );
    return { embeds: [embed], rows: [row] };
  }
};

export default def;