import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
  VoiceState
} from "discord.js";
import { IGuildConfig, ITempVoiceChannel, TempVoiceChannel, LiveDoc } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { ComponentRouter } from "../../handlers/componentRouter";
import { config } from "../../config";

const CONTROL_PANEL_TITLE = "🎙️ لوحة تحكم الروم الصوتي";

/**
 * نقطة الدخول التي يستدعيها حدث voiceStateUpdate: تتكفّل بإنشاء الرومات
 * المؤقتة عند دخول قناة "Join to Create"، وحذفها عند خروج آخر عضو منها،
 * وتحديث قوائم الطرد/النقل عند تغيّر أعضاء الروم.
 */
export async function handleVoiceStateUpdate(
  client: ExtendedClient,
  oldState: VoiceState,
  newState: VoiceState,
  gConfig: IGuildConfig
): Promise<void> {
  const tvConfig = gConfig.tempVoice;
  if (!tvConfig?.enabled || !tvConfig.joinToCreateChannelId) return;

  const guild = newState.guild ?? oldState.guild;

  // 1) انضمام لقناة "Join to Create" -> إنشاء روم صوتي مؤقت جديد
  if (
    newState.channelId &&
    newState.channelId === tvConfig.joinToCreateChannelId &&
    newState.member
  ) {
    await createTempChannel(newState, tvConfig);
  }

  // 2) مغادرة روم مؤقت -> حذفه من ديسكورد وقاعدة البيانات إن أصبح فارغاً
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    await cleanupIfEmpty(oldState);
  }

  // 3) تحديث قوائم الطرد/نقل الملكية في اللوحة عند انضمام عضو لروم مؤقت قائم
  if (
    newState.channelId &&
    newState.channelId !== oldState.channelId &&
    newState.channelId !== tvConfig.joinToCreateChannelId
  ) {
    await refreshPanelIfTemp(guild, newState.channelId);
  }
}

/** تسجّل معالِجات الأزرار/القوائم/النماذج الخاصة بلوحة تحكم الروم الصوتي */
export function registerTempVoiceComponents(router: ComponentRouter): void {
  router.registerButton("voice_lock", (interaction) => handleToggleAction(interaction, "lock"));
  router.registerButton("voice_unlock", (interaction) =>
    handleToggleAction(interaction, "unlock")
  );
  router.registerButton("voice_hide", (interaction) => handleToggleAction(interaction, "hide"));
  router.registerButton("voice_unhide", (interaction) =>
    handleToggleAction(interaction, "unhide")
  );
  router.registerButton("voice_increase", (interaction) => handleLimitChange(interaction, 1));
  router.registerButton("voice_decrease", (interaction) => handleLimitChange(interaction, -1));
  router.registerButton("voice_rename", handleRenameButton);
  router.registerButton("voice_claim", handleClaim);

  router.registerSelect("voice_kick_select", handleKickSelect);
  router.registerSelect("voice_owner_select", handleOwnerSelect);

  router.registerModal("voice_rename_modal", handleRenameModalSubmit);
}

/* -------------------------------------------------------------------------- */
/* إنشاء وحذف الرومات المؤقتة                                                  */
/* -------------------------------------------------------------------------- */

async function createTempChannel(
  newState: VoiceState,
  tvConfig: IGuildConfig["tempVoice"]
): Promise<void> {
  const member = newState.member;
  const guild = newState.guild;
  if (!member) return;

  const joinChannel = newState.channel;
  const parentId = tvConfig.categoryId || joinChannel?.parentId || undefined;
  const name = (tvConfig.nameTemplate || "روم {user}").replace("{user}", member.displayName);
  const userLimit = Math.min(Math.max(tvConfig.defaultUserLimit ?? 0, 0), 99);

  let newChannel: VoiceChannel;
  try {
    newChannel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: parentId,
      userLimit
    });
  } catch (err) {
    console.error("فشل إنشاء الروم الصوتي المؤقت:", err);
    return;
  }

  try {
    await member.voice.setChannel(newChannel);
  } catch (err) {
    console.error("فشل نقل العضو إلى الروم الصوتي الجديد:", err);
  }

  try {
    await TempVoiceChannel.create({
      guildId: guild.id,
      channelId: newChannel.id,
      ownerId: member.id
    });
  } catch (err) {
    console.error("فشل حفظ بيانات الروم الصوتي المؤقت:", err);
  }

  try {
    await newChannel.send({
      embeds: [buildControlEmbed()],
      components: buildControlComponents(newChannel)
    });
  } catch (err) {
    console.error("فشل إرسال لوحة تحكم الروم الصوتي:", err);
  }
}

async function cleanupIfEmpty(oldState: VoiceState): Promise<void> {
  const channelId = oldState.channelId;
  if (!channelId) return;

  const doc = await TempVoiceChannel.findOne({ channelId });
  if (!doc) return;

  const channel = oldState.guild.channels.cache.get(channelId);
  if (!channel) {
    await TempVoiceChannel.deleteOne({ channelId }).catch(() => {});
    return;
  }

  if (channel.type === ChannelType.GuildVoice && channel.members.size === 0) {
    await channel.delete().catch(() => {});
    await TempVoiceChannel.deleteOne({ channelId }).catch(() => {});
  }
}

async function refreshPanelIfTemp(guild: Guild, channelId: string): Promise<void> {
  const doc = await TempVoiceChannel.findOne({ channelId });
  if (!doc) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  await refreshControlPanel(channel);
}

/* -------------------------------------------------------------------------- */
/* بناء لوحة التحكم                                                            */
/* -------------------------------------------------------------------------- */

function buildControlEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(CONTROL_PANEL_TITLE)
    .setDescription(
      [
        "يمكنك التحكم برومك الصوتي من خلال الأزرار والقوائم أدناه:",
        "",
        "🔒 **قفل** — يمنع انضمام أعضاء جدد إلى الروم",
        "🔓 **فتح** — يسمح لأي عضو بالانضمام إلى الروم",
        "👁️ **إخفاء** — يخفي الروم عن باقي الأعضاء",
        "👁️‍🗨️ **إظهار** — يُظهر الروم لباقي الأعضاء",
        "➕ **زيادة العدد** — يزيد الحد الأقصى للأعضاء بالروم",
        "➖ **إنقاص العدد** — ينقص الحد الأقصى للأعضاء بالروم",
        "✏️ **تغيير الاسم** — يفتح نافذة لتغيير اسم الروم",
        "👑 **استلام الملكية** — تصبح مالك الروم إذا كان المالك الحالي غير متواجد فيه",
        "🦵 **طرد عضو** — اختر عضواً من القائمة لطرده من الروم",
        "🎁 **نقل الملكية** — اختر عضواً من القائمة لنقل ملكية الروم إليه"
      ].join("\n")
    )
    .setFooter({ text: "هذا التحكم متاح فقط لمالك الروم" });
}

function buildMemberSelectOptions(channel: VoiceChannel): StringSelectMenuOptionBuilder[] {
  const members = Array.from(channel.members.values()).slice(0, 25);
  if (members.length === 0) {
    return [
      new StringSelectMenuOptionBuilder().setLabel("لا يوجد أعضاء حالياً").setValue("none")
    ];
  }
  return members.map((m) =>
    new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(m.id)
  );
}

function buildControlComponents(channel: VoiceChannel) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("voice_lock")
      .setEmoji("🔒")
      .setLabel("قفل")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("voice_unlock")
      .setEmoji("🔓")
      .setLabel("فتح")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("voice_hide")
      .setEmoji("👁️")
      .setLabel("إخفاء")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("voice_unhide")
      .setEmoji("👁️‍🗨️")
      .setLabel("إظهار")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("voice_increase")
      .setEmoji("➕")
      .setLabel("زيادة العدد")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("voice_decrease")
      .setEmoji("➖")
      .setLabel("إنقاص العدد")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("voice_rename")
      .setEmoji("✏️")
      .setLabel("تغيير الاسم")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("voice_claim")
      .setEmoji("👑")
      .setLabel("استلام الملكية")
      .setStyle(ButtonStyle.Secondary)
  );

  const kickSelect = new StringSelectMenuBuilder()
    .setCustomId("voice_kick_select")
    .setPlaceholder("🦵 اختر عضواً لطرده من الروم")
    .addOptions(buildMemberSelectOptions(channel));

  const ownerSelect = new StringSelectMenuBuilder()
    .setCustomId("voice_owner_select")
    .setPlaceholder("🎁 اختر عضواً لنقل ملكية الروم إليه")
    .addOptions(buildMemberSelectOptions(channel));

  const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(kickSelect);
  const row4 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(ownerSelect);

  return [row1, row2, row3, row4];
}

async function refreshControlPanel(channel: VoiceChannel): Promise<void> {
  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (!messages) return;

  const panelMessage = messages.find(
    (m) => m.author.id === channel.client.user?.id && m.embeds[0]?.title === CONTROL_PANEL_TITLE
  );
  if (!panelMessage) return;

  await panelMessage.edit({ components: buildControlComponents(channel) }).catch(() => {});
}

/* -------------------------------------------------------------------------- */
/* التحقق من صلاحية الإجراء                                                    */
/* -------------------------------------------------------------------------- */

interface VoiceActionContext {
  channel: VoiceChannel;
  doc: LiveDoc<ITempVoiceChannel>;
  member: GuildMember;
}

async function resolveVoiceContext(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction
): Promise<VoiceActionContext | null> {
  const guild = interaction.guild;
  if (!guild || !interaction.channelId) return null;

  const channel = guild.channels.cache.get(interaction.channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return null;

  const doc = await TempVoiceChannel.findOne({ channelId: channel.id });
  if (!doc) return null;

  const member = interaction.member as GuildMember;
  return { channel, doc, member };
}

async function replyEphemeral(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  content: string
): Promise<void> {
  await interaction.reply({ content, ephemeral: true });
}

/* -------------------------------------------------------------------------- */
/* معالجات الأزرار                                                             */
/* -------------------------------------------------------------------------- */

type ToggleAction = "lock" | "unlock" | "hide" | "unhide";

async function handleToggleAction(
  interaction: ButtonInteraction,
  action: ToggleAction
): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ هذا الزر غير صالح أو الروم لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الزر.");
    return;
  }
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ هذا الإجراء متاح لمالك الروم فقط.");
    return;
  }

  const everyone = channel.guild.roles.everyone;
  switch (action) {
    case "lock":
      await channel.permissionOverwrites.edit(everyone, { Connect: false });
      await replyEphemeral(interaction, "🔒 تم قفل الروم بنجاح.");
      break;
    case "unlock":
      await channel.permissionOverwrites.edit(everyone, { Connect: null });
      await replyEphemeral(interaction, "🔓 تم فتح الروم بنجاح.");
      break;
    case "hide":
      await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
      await replyEphemeral(interaction, "👁️ تم إخفاء الروم بنجاح.");
      break;
    case "unhide":
      await channel.permissionOverwrites.edit(everyone, { ViewChannel: null });
      await replyEphemeral(interaction, "👁️‍🗨️ تم إظهار الروم بنجاح.");
      break;
  }
}

async function handleLimitChange(interaction: ButtonInteraction, delta: number): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ هذا الزر غير صالح أو الروم لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الزر.");
    return;
  }
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ هذا الإجراء متاح لمالك الروم فقط.");
    return;
  }

  const current = channel.userLimit ?? 0;
  const next = Math.min(99, Math.max(0, current + delta));
  await channel.setUserLimit(next);

  await replyEphemeral(
    interaction,
    next === 0
      ? "✅ تم إلغاء الحد الأقصى للأعضاء (غير محدود)."
      : `✅ تم ضبط الحد الأقصى للأعضاء إلى ${next}.`
  );
}

async function handleRenameButton(interaction: ButtonInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ هذا الزر غير صالح أو الروم لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الزر.");
    return;
  }
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ هذا الإجراء متاح لمالك الروم فقط.");
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("voice_rename_modal")
    .setTitle("تغيير اسم الروم الصوتي");

  const input = new TextInputBuilder()
    .setCustomId("voice_rename_input")
    .setLabel("الاسم الجديد للروم")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(100)
    .setValue(channel.name)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

  await interaction.showModal(modal);
}

async function handleRenameModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ الروم الصوتي لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الإجراء.");
    return;
  }
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ هذا الإجراء متاح لمالك الروم فقط.");
    return;
  }

  const newName = interaction.fields.getTextInputValue("voice_rename_input").trim();
  if (!newName) {
    await replyEphemeral(interaction, "❌ الاسم المدخل غير صالح.");
    return;
  }

  await channel.setName(newName.slice(0, 100));
  await replyEphemeral(interaction, `✅ تم تغيير اسم الروم إلى **${newName}**.`);
}

async function handleClaim(interaction: ButtonInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ هذا الزر غير صالح أو الروم لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الزر.");
    return;
  }

  if (doc.ownerId === member.id) {
    await replyEphemeral(interaction, "✅ أنت بالفعل مالك هذا الروم.");
    return;
  }

  const ownerStillPresent = channel.members.has(doc.ownerId);
  if (ownerStillPresent) {
    await replyEphemeral(interaction, "❌ لا يمكنك استلام الملكية لأن المالك الحالي موجود في الروم.");
    return;
  }

  doc.ownerId = member.id;
  await doc.save();

  await replyEphemeral(interaction, "👑 تم استلام ملكية الروم بنجاح.");
  await refreshControlPanel(channel).catch(() => {});
}

/* -------------------------------------------------------------------------- */
/* معالجات القوائم المنسدلة                                                    */
/* -------------------------------------------------------------------------- */

async function handleKickSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ هذه القائمة غير صالحة أو الروم لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الإجراء.");
    return;
  }
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ هذا الإجراء متاح لمالك الروم فقط.");
    return;
  }

  const targetId = interaction.values[0];
  if (targetId === "none") {
    await replyEphemeral(interaction, "❌ لا يوجد أعضاء لطردهم حالياً.");
    return;
  }
  if (targetId === member.id) {
    await replyEphemeral(interaction, "❌ لا يمكنك طرد نفسك.");
    return;
  }

  const targetMember = channel.members.get(targetId);
  if (!targetMember) {
    await replyEphemeral(interaction, "❌ هذا العضو لم يعد داخل الروم.");
    return;
  }

  await targetMember.voice.disconnect().catch(() => {});
  await replyEphemeral(interaction, `🦵 تم طرد **${targetMember.displayName}** من الروم.`);
  await refreshControlPanel(channel).catch(() => {});
}

async function handleOwnerSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ هذه القائمة غير صالحة أو الروم لم يعد موجوداً.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (member.voice.channelId !== channel.id) {
    await replyEphemeral(interaction, "❌ يجب أن تكون داخل هذا الروم الصوتي لاستخدام هذا الإجراء.");
    return;
  }
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ هذا الإجراء متاح لمالك الروم فقط.");
    return;
  }

  const targetId = interaction.values[0];
  if (targetId === "none") {
    await replyEphemeral(interaction, "❌ لا يوجد أعضاء لنقل الملكية إليهم حالياً.");
    return;
  }
  if (targetId === member.id) {
    await replyEphemeral(interaction, "✅ أنت بالفعل مالك هذا الروم.");
    return;
  }

  const targetMember = channel.members.get(targetId);
  if (!targetMember) {
    await replyEphemeral(interaction, "❌ هذا العضو لم يعد داخل الروم.");
    return;
  }

  doc.ownerId = targetId;
  await doc.save();

  await replyEphemeral(interaction, `🎁 تم نقل ملكية الروم إلى **${targetMember.displayName}**.`);
  await refreshControlPanel(channel).catch(() => {});
}
