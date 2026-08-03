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

const CONTROL_PANEL_TITLE = "⚙️ Welcome to your own temporary voice channel";

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
  // Not needed since panel is sent in voice channel
}

/** تسجّل معالِجات الأزرار/القوائم/النماذج الخاصة بلوحة تحكم الروم الصوتي */
export function registerTempVoiceComponents(router: ComponentRouter): void {
  // New select menus
  router.registerSelect("temp_channel_settings", handleSettingsSelect);
  router.registerSelect("temp_channel_permissions", handlePermissionsSelect);
  router.registerSelect("temp_transfer_select", handleTransferSelect);
  
  // New buttons
  router.registerButton("temp_load_settings", handleLoadSettings);
  router.registerButton("temp_dashboard", handleDashboard);

  // New modals
  router.registerModal("temp_name_modal", handleNameModalSubmit);
  router.registerModal("temp_limit_modal", handleLimitModalSubmit);
  router.registerModal("temp_status_modal", handleStatusModalSubmit);
  router.registerModal("temp_game_modal", handleGameModalSubmit);
  router.registerModal("temp_bitrate_modal", handleBitrateModalSubmit);
  router.registerModal("temp_region_modal", handleRegionModalSubmit);
  router.registerModal("temp_permit_modal", handlePermitModalSubmit);
  router.registerModal("temp_reject_modal", handleRejectModalSubmit);
  router.registerModal("temp_invite_modal", handleInviteModalSubmit);

  // Legacy handlers (keep for compatibility)
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
    // Delete the voice channel
    await channel.delete().catch(() => {});
    await TempVoiceChannel.deleteOne({ channelId }).catch(() => {});
  }
}

/* -------------------------------------------------------------------------- */
/* وظائف مساعدة                                                                 */
/* -------------------------------------------------------------------------- */

/** التحقق من أن المستخدم هو صاحب الروم الصوتي المؤقت */
async function isChannelOwner(channelId: string, userId: string): Promise<boolean> {
  const doc = await TempVoiceChannel.findOne({ channelId });
  if (!doc) return false;
  return doc.ownerId === userId;
}

/* -------------------------------------------------------------------------- */
/* بناء لوحة التحكم                                                            */
/* -------------------------------------------------------------------------- */

function buildControlEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(CONTROL_PANEL_TITLE)
    .setDescription(
      [
        "Control your channel using the menus below:",
        "",
        "• Use the dropdowns to manage settings and permissions",
        "• Alternatively use `/voice` commands",
        "• Use `/toggle set` to disable this interface"
      ].join("\n")
    )
    .setFooter({ text: "This control panel is only available to the channel owner" });
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
  // First select menu: temp_channel_settings
  const settingsSelect = new StringSelectMenuBuilder()
    .setCustomId("temp_channel_settings")
    .setPlaceholder("Change channel settings")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Name")
        .setDescription("Change the channel name")
        .setValue("temp_name"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Limit")
        .setDescription("Change the channel limit")
        .setValue("temp_limit"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Status")
        .setDescription("Change the channel status")
        .setValue("temp_status"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Game")
        .setDescription("Change the channel name to the game you're playing")
        .setValue("temp_game"),
      new StringSelectMenuOptionBuilder()
        .setLabel("LFM")
        .setDescription("Post a message to the LFM channel to let others know you're looking for members")
        .setValue("temp_lfm"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Bitrate")
        .setDescription("Change the channel bitrate")
        .setValue("temp_bitrate"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Region")
        .setDescription("Change the channel voice region")
        .setValue("temp_region"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Text")
        .setDescription("Create a temporary text channel")
        .setValue("temp_text"),
      new StringSelectMenuOptionBuilder()
        .setLabel("NSFW")
        .setDescription("Set your temporary channel to NSFW")
        .setValue("temp_nsfw"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Claim")
        .setDescription("Claim ownership of the channel")
        .setValue("temp_claim")
    );

  // Second select menu: temp_channel_permissions
  const permissionsSelect = new StringSelectMenuBuilder()
    .setCustomId("temp_channel_permissions")
    .setPlaceholder("Change channel permissions")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Lock")
        .setDescription("Lock the channel")
        .setValue("temp_lock"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Unlock")
        .setDescription("Unlock the channel")
        .setValue("temp_unlock"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Permit")
        .setDescription("Permit users/roles to access the channel")
        .setValue("temp_permit"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Reject")
        .setDescription("Reject/kick users/roles from accessing the channel")
        .setValue("temp_reject"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Invite")
        .setDescription("Invite a user to access the channel")
        .setValue("temp_invite"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Ghost")
        .setDescription("Make your channel invisible")
        .setValue("temp_ghost"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Unghost")
        .setDescription("Make your channel visible")
        .setValue("temp_unghost"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Transfer")
        .setDescription("Transfer ownership to another user")
        .setValue("temp_transfer")
    );

  // Third row: Buttons
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("temp_load_settings")
      .setLabel("Load Settings")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("temp_dashboard")
      .setLabel("Dashboard")
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(permissionsSelect),
    buttonRow
  ];
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
  content: string | { embeds: EmbedBuilder[] }
): Promise<void> {
  if (typeof content === "string") {
    await interaction.reply({ content, ephemeral: true });
  } else {
    await interaction.reply({ ...content, ephemeral: true });
  }
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

  // Rename the associated text channel
  if ((doc as any).textChannelId) {
    const textChannel = channel.guild.channels.cache.get((doc as any).textChannelId);
    if (textChannel && textChannel.type === ChannelType.GuildText) {
      await textChannel.setName(`text-${newName.slice(0, 100)}`).catch(() => {});
    }
  }

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
}

/* -------------------------------------------------------------------------- */
/* معالجات القوائم الجديدة                                                      */
/* -------------------------------------------------------------------------- */

async function handleSettingsSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await interaction.reply({ content: "❌ This voice channel no longer exists.", ephemeral: true });
    return;
  }
  const { channel, doc, member } = ctx;

  // Check ownership
  if (doc.ownerId !== member.id) {
    await interaction.reply({ content: "❌ You are not the owner of this voice channel!", ephemeral: true });
    return;
  }

  const action = interaction.values[0];
  
  switch (action) {
    case "temp_name":
      await showNameModal(interaction);
      break;
    case "temp_limit":
      await showLimitModal(interaction);
      break;
    case "temp_status":
      await showStatusModal(interaction);
      break;
    case "temp_game":
      await showGameModal(interaction);
      break;
    case "temp_lfm":
      await handleLFM(interaction, channel);
      break;
    case "temp_bitrate":
      await showBitrateModal(interaction);
      break;
    case "temp_region":
      await showRegionModal(interaction);
      break;
    case "temp_text":
      await handleCreateTextChannel(interaction, channel);
      break;
    case "temp_nsfw":
      await handleToggleNSFW(interaction, channel);
      break;
    case "temp_claim":
      await handleClaimFromMenu(interaction, channel, doc, member);
      break;
    default:
      await interaction.reply({ content: "❌ Unknown action.", ephemeral: true });
  }
}

async function handlePermissionsSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await interaction.reply({ content: "❌ This voice channel no longer exists.", ephemeral: true });
    return;
  }
  const { channel, doc, member } = ctx;

  // Check ownership
  if (doc.ownerId !== member.id) {
    await interaction.reply({ content: "❌ You are not the owner of this voice channel!", ephemeral: true });
    return;
  }

  const action = interaction.values[0];
  
  switch (action) {
    case "temp_lock":
      await handleLock(interaction, channel);
      break;
    case "temp_unlock":
      await handleUnlock(interaction, channel);
      break;
    case "temp_permit":
      await showPermitModal(interaction);
      break;
    case "temp_reject":
      await showRejectModal(interaction);
      break;
    case "temp_invite":
      await showInviteModal(interaction);
      break;
    case "temp_ghost":
      await handleGhost(interaction, channel);
      break;
    case "temp_unghost":
      await handleUnghost(interaction, channel);
      break;
    case "temp_transfer":
      await showTransferModal(interaction, channel);
      break;
    default:
      await interaction.reply({ content: "❌ Unknown action.", ephemeral: true });
  }
}

async function handleLoadSettings(interaction: ButtonInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  // Check ownership
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("⚙️ Current Channel Settings")
    .addFields(
      { name: "Channel Name", value: channel.name, inline: true },
      { name: "User Limit", value: channel.userLimit ? channel.userLimit.toString() : "Unlimited", inline: true },
      { name: "Owner", value: `<@${doc.ownerId}>`, inline: true },
      { name: "Locked", value: doc.locked ? "Yes" : "No", inline: true },
      { name: "Hidden", value: doc.hidden ? "Yes" : "No", inline: true }
    );

  await replyEphemeral(interaction, { embeds: [embed] });
}

async function handleDashboard(interaction: ButtonInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  // Check ownership
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  await replyEphemeral(interaction, "🔗 Dashboard feature coming soon!");
}

/* -------------------------------------------------------------------------- */
/* معالجات الإجراءات الفرعية                                                     */
/* -------------------------------------------------------------------------- */

async function showNameModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_name_modal")
    .setTitle("Change Channel Name")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("channel_name")
          .setLabel("New channel name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      )
    );
  await interaction.showModal(modal);
}

async function showLimitModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_limit_modal")
    .setTitle("Change User Limit")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("user_limit")
          .setLabel("User limit (0-99, 0 for unlimited)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("0")
      )
    );
  await interaction.showModal(modal);
}

async function showStatusModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_status_modal")
    .setTitle("Change Channel Status")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("channel_status")
          .setLabel("Channel status (e.g., AFK, Gaming)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
      )
    );
  await interaction.showModal(modal);
}

async function showGameModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_game_modal")
    .setTitle("Set Game Name")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("game_name")
          .setLabel("Game name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      )
    );
  await interaction.showModal(modal);
}

async function handleLFM(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await replyEphemeral(interaction, "🔍 LFM feature coming soon!");
}

async function showBitrateModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_bitrate_modal")
    .setTitle("Change Bitrate")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("bitrate")
          .setLabel("Bitrate in kbps (8-384)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("64")
      )
    );
  await interaction.showModal(modal);
}

async function showRegionModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_region_modal")
    .setTitle("Change Voice Region")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("region")
          .setLabel("Region code (e.g., us-west, europe)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("us-west")
      )
    );
  await interaction.showModal(modal);
}

async function handleCreateTextChannel(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await replyEphemeral(interaction, "💬 Text channel creation coming soon!");
}

async function handleToggleNSFW(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await replyEphemeral(interaction, "⚠️ NSFW toggle coming soon!");
}

async function handleClaimFromMenu(interaction: StringSelectMenuInteraction, channel: VoiceChannel, doc: LiveDoc<ITempVoiceChannel>, member: GuildMember): Promise<void> {
  if (doc.ownerId === member.id) {
    await replyEphemeral(interaction, "✅ You are already the owner of this channel.");
    return;
  }

  const ownerStillPresent = channel.members.has(doc.ownerId);
  if (ownerStillPresent) {
    await replyEphemeral(interaction, "❌ You cannot claim ownership while the current owner is in the channel.");
    return;
  }

  doc.ownerId = member.id;
  await doc.save();

  // Update text channel permissions
  if ((doc as any).textChannelId) {
    const textChannel = channel.guild.channels.cache.get((doc as any).textChannelId);
    if (textChannel && textChannel.type === ChannelType.GuildText) {
      await textChannel.permissionOverwrites.edit(doc.ownerId, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false
      }).catch(() => {});
      await textChannel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      }).catch(() => {});
    }
  }

  await replyEphemeral(interaction, "👑 You have successfully claimed ownership of this channel.");
}

async function handleLock(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
  await replyEphemeral(interaction, "🔒 Channel locked successfully.");
}

async function handleUnlock(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
  await replyEphemeral(interaction, "🔓 Channel unlocked successfully.");
}

async function showPermitModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_permit_modal")
    .setTitle("Permit User/Role")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("permit_target")
          .setLabel("User ID or Role ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

async function showRejectModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_reject_modal")
    .setTitle("Reject/Kick User/Role")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reject_target")
          .setLabel("User ID or Role ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

async function showInviteModal(interaction: StringSelectMenuInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("temp_invite_modal")
    .setTitle("Invite User")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("invite_user")
          .setLabel("User ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

async function handleGhost(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
  await replyEphemeral(interaction, "👻 Channel is now invisible.");
}

async function handleUnghost(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
  await replyEphemeral(interaction, "👁️ Channel is now visible.");
}

async function showTransferModal(interaction: StringSelectMenuInteraction, channel: VoiceChannel): Promise<void> {
  const members = Array.from(channel.members.values());
  if (members.length === 0) {
    await replyEphemeral(interaction, "❌ No members available to transfer ownership to.");
    return;
  }

  const options = members
    .filter(m => m.id !== interaction.user.id)
    .slice(0, 25)
    .map(m => new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(m.id));

  const select = new StringSelectMenuBuilder()
    .setCustomId("temp_transfer_select")
    .setPlaceholder("Select a member to transfer ownership to")
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  await interaction.reply({ content: "Select a member to transfer ownership to:", components: [row], ephemeral: true });
}

async function handleTransferSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  // Check ownership
  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const targetId = interaction.values[0];
  if (targetId === member.id) {
    await replyEphemeral(interaction, "✅ You are already the owner of this channel.");
    return;
  }

  const targetMember = channel.members.get(targetId);
  if (!targetMember) {
    await replyEphemeral(interaction, "❌ This member is no longer in the channel.");
    return;
  }

  doc.ownerId = targetId;
  await doc.save();

  await replyEphemeral(interaction, `🎁 Ownership transferred to **${targetMember.displayName}**.`);
}

/* -------------------------------------------------------------------------- */
/* معالجات النماذج (Modals)                                                     */
/* -------------------------------------------------------------------------- */

async function handleNameModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const newName = interaction.fields.getTextInputValue("channel_name");
  await channel.setName(newName);
  await replyEphemeral(interaction, `✅ Channel name changed to **${newName}**.`);
}

async function handleLimitModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const limit = parseInt(interaction.fields.getTextInputValue("user_limit"), 10);
  if (isNaN(limit) || limit < 0 || limit > 99) {
    await replyEphemeral(interaction, "❌ Invalid limit. Must be between 0 and 99.");
    return;
  }

  await channel.setUserLimit(limit === 0 ? 0 : limit);
  await replyEphemeral(interaction, `✅ User limit changed to ${limit === 0 ? "unlimited" : limit}.`);
}

async function handleStatusModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const status = interaction.fields.getTextInputValue("channel_status");
  await channel.setName(status);
  await replyEphemeral(interaction, `✅ Channel status changed to **${status}**.`);
}

async function handleGameModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const gameName = interaction.fields.getTextInputValue("game_name");
  await channel.setName(gameName);
  await replyEphemeral(interaction, `✅ Channel name changed to game: **${gameName}**.`);
}

async function handleBitrateModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const bitrate = parseInt(interaction.fields.getTextInputValue("bitrate"), 10);
  if (isNaN(bitrate) || bitrate < 8 || bitrate > 384) {
    await replyEphemeral(interaction, "❌ Invalid bitrate. Must be between 8 and 384 kbps.");
    return;
  }

  await channel.setBitrate(bitrate * 1000);
  await replyEphemeral(interaction, `✅ Bitrate changed to ${bitrate} kbps.`);
}

async function handleRegionModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const region = interaction.fields.getTextInputValue("region");
  await replyEphemeral(interaction, "🌐 Region setting coming soon!");
}

async function handlePermitModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const targetId = interaction.fields.getTextInputValue("permit_target");
  await channel.permissionOverwrites.edit(targetId, { Connect: true });
  await replyEphemeral(interaction, `✅ Permitted <@${targetId}> to access the channel.`);
}

async function handleRejectModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const targetId = interaction.fields.getTextInputValue("reject_target");
  await channel.permissionOverwrites.edit(targetId, { Connect: false });
  await replyEphemeral(interaction, `✅ Rejected <@${targetId}> from accessing the channel.`);
}

async function handleInviteModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const ctx = await resolveVoiceContext(interaction);
  if (!ctx) {
    await replyEphemeral(interaction, "❌ This voice channel no longer exists.");
    return;
  }
  const { channel, doc, member } = ctx;

  if (doc.ownerId !== member.id) {
    await replyEphemeral(interaction, "❌ You are not the owner of this voice channel!");
    return;
  }

  const userId = interaction.fields.getTextInputValue("invite_user");
  await channel.permissionOverwrites.edit(userId, { Connect: true });
  await replyEphemeral(interaction, `✅ Invited <@${userId}> to the channel.`);
}
