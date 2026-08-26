import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export interface MafiaState {
  players: { id: string; role: "mafia" | "doctor" | "detective" | "civilian"; alive: boolean }[];
  phase: "night" | "day";
  nightActions: { mafiaTarget?: string; doctorSave?: string; detectiveCheck?: string };
  dayVotes: Record<string, string>;
}

export async function startMafiaGame(channel: any, players: string[]) {
  // توزيع أدوار
  const roles: Array<"mafia" | "doctor" | "detective" | "civilian"> = ["mafia", "doctor", "detective"];
  while (roles.length < players.length) roles.push("civilian");
  // خلط
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const state: MafiaState = {
    players: players.map((id, i) => ({ id, role: roles[i], alive: true })),
    phase: "night",
    nightActions: {},
    dayVotes: {}
  };

  // إرسال الأدوار في الخاص
  for (const p of state.players) {
    try {
      const user = await channel.client.users.fetch(p.id);
      await user.send({ embeds: [new EmbedBuilder().setColor(0x2f3136).setTitle("مافيا — دورك").setDescription(`دورك: **${p.role}**`)] }).catch(() => null);
    } catch {}
  }

  const embed = new EmbedBuilder().setColor(0x2f3136).setTitle("مافيا — الليل").setDescription("المافيا، اختاروا ضحية. الطبيب، احمِ شخصًا. المحقق، تحقق.");
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    state.players.filter((p) => p.alive).map((p) => new ButtonBuilder().setCustomId(`mafia:vote:${p.id}`).setLabel(p.id.slice(-4)).setStyle(ButtonStyle.Secondary))
  );
  await channel.send({ embeds: [embed], components: [row] });

  // هنا يبدأ التفاعل — سيتم التعامل معه عبر componentRouter
  return state;
}