/**
 * أنواع بيانات إعدادات السيرفر (GuildConfig) بشكل خالص بدون أي اعتماد على طبقة قاعدة
 * البيانات، حتى تكون آمنة للاستيراد من مكوّنات العميل (Client Components) في لوحة التحكم
 * دون سحب حزمة `pg` إلى حزمة المتصفح (Browser Bundle).
 */

/** رسالة قابلة للتخصيص (نص/إيمبد/أزرار) تدعم متغيرات ديناميكية مثل {user} */
export interface ICustomMessage {
  enabled: boolean;
  content?: string;
  embed?: {
    enabled: boolean;
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: boolean;
    image?: string;
    footer?: string;
    author?: string;
  };
  buttons?: {
    label: string;
    style: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER" | "LINK";
    emoji?: string;
    url?: string;
    customId?: string;
  }[];
}

export interface ITicketCategory {
  key: string;
  name: string;
  emoji?: string;
  categoryId?: string;
  staffRoleIds: string[];
  blockedRoleIds: string[];
  logChannelId?: string;
  welcomeMessage?: ICustomMessage;
  questions: string[];
  ticketNameFormat?: string;
  closeButtonLabel?: string;
  claimButtonLabel?: string;
  openMessage?: ICustomMessage;
  closeMessage?: ICustomMessage;
  claimMessage?: ICustomMessage;
}

export interface ICommandOverride {
  name: string;
  enabled: boolean;
  alias?: string;
  /** بادئة مخصصة لهذا الأمر (مثل `,` أو `.`) — تتجاوز البادئة العامة للسيرفر */
  customPrefix?: string;
  /** مدة البرودة الخاصة بهذا الأمر بالثواني (تتجاوز cooldownSeconds العام للأمر إن وُجد) */
  cooldownSeconds?: number;
  slashEnabled: boolean;
  prefixEnabled: boolean;
  allowedRoleIds: string[];
  deniedRoleIds: string[];
  allowedUserIds: string[];
  deniedUserIds: string[];
  allowedChannelIds: string[];
  deniedChannelIds: string[];
  customResponse?: ICustomMessage;
}

/**
 * إعدادات صلاحيات لوحة التحكم الخاصة بالسيرفر (قابلة للتوسع لاحقًا بالأقسام/المراحل).
 * ملاحظة أمنية: هذه الصلاحيات لا تتجاوز أبدًا صلاحيات Discord الأساسية — فالعضو
 * يجب أن يكون فعليًا في السيرفر ويحمل إحدى الرتب المعينة أو مدرجًا في userIds.
 */
export interface IGuildDashboardRole {
  id: string;
  name: string;
  /** رتب Discord التي تمنح الوصول للوحة التحكم */
  roleIds: string[];
  /** مستخدمون محددون يُمنحون الوصول مباشرة */
  userIds: string[];
  /** الأقسام المتاحة لهذه الصلاحية (فارغ = كل الأقسام) — للاستخدام لاحقًا */
  sections?: string[];
}

export interface IGuildDashboardSettings {
  /** هل يُسمح لأعضاء رتبة Administrator (عبر Discord) بصلاحيات اللوحة؟ الافتراضي: نعم */
  allowAdministrators: boolean;
  /** رتب الداشبورد المخصصة */
  roles: IGuildDashboardRole[];
}

export interface IAutoResponse {
  id: string;
  trigger: string;
  matchType: "exact" | "contains" | "startsWith" | "regex";
  responses: ICustomMessage[];
  response?: ICustomMessage; // Deprecated: use responses instead
  channelIds: string[];
  enabled: boolean;
  deleteTrigger: boolean;
  cooldownSeconds?: number;
  requiredRoleIds?: string[];
  ignoreBots?: boolean;
}

export interface ISelfRoleOption {
  roleId: string;
  label: string;
  emoji?: string;
  description?: string;
}

export interface ISelfRolePanel {
  id: string;
  title: string;
  description?: string;
  channelId?: string;
  messageId?: string;
  type: "button" | "select";
  maxRoles?: number;
  /** معطّل = لا تستجيب اللوحة للنقر ولا تُعرض في النشر */
  enabled?: boolean;
  /** لون الـ Embed (hex مثل #5865F2) */
  color?: string;
  options: ISelfRoleOption[];
}

export interface IColorRole {
  roleId: string;
  name: string;
  emoji?: string;
  hex?: string;
  allowedRoleIds: string[];
}

export interface ILevelRoleReward {
  level: number;
  roleId: string;
  removePrevious?: boolean;
}

/** رتبة تمنح بالرياكشن على رسالة محددة */
export interface IReactionRole {
  roleId: string;
  label?: string;
  /** إيموجي يونيكود أو ID الإيموجي المخصص أو صيغة <:name:id> */
  emoji: string;
}

/** رسالة مجدولة تُرسل في وقت محدد ويمكن أن تتكرر كل X دقيقة */
export interface IScheduledMessage {
  id: string;
  channelId: string;
  content: string;
  embed?: {
    enabled: boolean;
    title?: string;
    description?: string;
    color?: string;
  };
  /** أول وقت إرسال (ISO) */
  runAt?: string;
  /** التكرار كل N دقيقة (0 = مرة واحدة) */
  repeatMinutes: number;
  enabled: boolean;
  lastRunAt?: string;
}

/**
 * إعدادات نظام الأذكار والمحتوى الإسلامي — القاعدة تحفظ الإعدادات والحالة فقط،
 * والمحتوى الديني (قرآن/حديث/أذكار) يُجلب من مكتبة islam.js في وقت النشر.
 */
export interface IIslamicContent {
  enabled: boolean;
  /** قناة النشر التلقائي */
  channelId: string | null;
  /** فترة النشر بالدقائق */
  intervalMinutes: number;
  /** أنواع المحتوى المفعّلة: quran | hadith | azkar */
  contentTypes: string[];
  /** مصادر الأحاديث المسموحة فقط (Bukhari / Muslim) */
  allowedSources: string[];
  /** تصنيفات الأذكار المفعّلة (أسماء تصنيفات islam.js) */
  azkarCategories: string[];
  /** منع تكرار نفس العنصر خلال هذه الفترة بالدقائق */
  antiRepeatMinutes: number;
  /** موعد النشر التالي (ISO) — لاستئناف الجدولة تلقائيًا بعد إعادة التشغيل */
  nextRunAt?: string;
  /** آخر عنصر تم نشره */
  lastPosted?: { id: string; type: string; at: string };
  /** عناصر أُرسلت مؤخرًا لمنع التكرار — { id, at } */
  recentlySent?: { id: string; at: string }[];
}

export interface IGuildConfig {
  _id?: string;
  guildId: string;
  prefix: string;
  language: "ar" | "en";
  embedColor?: string;

  tickets: {
    enabled: boolean;
    panelChannelId?: string;
    panelMessageId?: string;
    panelStyle: "buttons" | "select";
    panelEmbed?: ICustomMessage;
    panelButtonStyle?: "Primary" | "Secondary" | "Success" | "Danger";
    transcriptChannelId?: string;
    saveTranscriptAsHtml: boolean;
    maxOpenPerUser: number;
    categories: ITicketCategory[];
  };

  tempVoice: {
    enabled: boolean;
    joinToCreateChannelId?: string;
    categoryId?: string;
    defaultUserLimit: number;
    nameTemplate: string;
    controlPanelChannelId?: string;
    controlPanelMessageId?: string;
  };

  /** البوت مقيم دائمًا في روم صوتي محدد — يُضبط من الداشبورد */
  alwaysVoice: {
    enabled: boolean;
    channelId?: string;
  };

  colors: {
    enabled: boolean;
    panelChannelId?: string;
    panelMessageId?: string;
    /** آخر قالب تم تطبيقه (id من COLOR_TEMPLATES أو CUSTOM_TEMPLATE_ID) */
    templateId?: string;
    /** الرتبة التي أُنشئت رتب الألوان تحتها (للترتيب في السيرفر) */
    anchorRoleId?: string;
    /** ألوان القالب المخصص المختارة (HEX بدون #) */
    customHexes?: string[];
    /** صورة تُرسم كخلفية خلف عينات الألوان في صورة اللوحة */
    backgroundImageUrl?: string;
    roles: IColorRole[];
  };

  welcome: {
    enabled: boolean;
    channelId?: string;
    sendInDm: boolean;
    message: ICustomMessage;
    imageEnabled: boolean;
    imageBackground?: string;
  };

  leave: {
    enabled: boolean;
    channelId?: string;
    message: ICustomMessage;
    imageEnabled: boolean;
    imageBackground?: string;
  };

  autoResponses: IAutoResponse[];

  autoRole: {
    enabled: boolean;
    userRoleIds: string[];
    botRoleIds: string[];
  };

  selfRoles: ISelfRolePanel[];

  leveling: {
    enabled: boolean;
    xpPerMessage: { min: number; max: number };
    xpPerVoiceMinute: number;
    messageCooldownSeconds: number;
    levelUpMessage: ICustomMessage;
    levelUpChannelId?: string;
    announceInChannel: boolean;
    roleRewards: ILevelRoleReward[];
    ignoredChannelIds: string[];
    ignoredRoleIds: string[];
  };

  logging: {
    enabled: boolean;
    categoryId?: string;
    channels: {
      moderation?: string;
      members?: string;
      messages?: string;
      voice?: string;
      actions?: string;
      files?: string;
      server?: string;
      roles?: string;
      channels?: string;
      other?: string;
      invites?: string;
      gifblock?: string;
      suggestions?: string;
      access?: string;
      leveling?: string;
      jail?: string;
      reactionroles?: string;
    } & Record<string, string | undefined>;
    customChannels: {
      messages?: string[];
      commands?: string[];
      media?: string[];
      stickers?: string[];
    };
  };

  automod: {
    enabled: boolean;
    antiInvite: boolean;
    antiLink: boolean;
    antiSpam: { enabled: boolean; maxMessages: number; perSeconds: number };
    antiMention: { enabled: boolean; maxMentions: number };
    antiCaps: { enabled: boolean; percentThreshold: number; minLength: number };
    antiRepeat: { enabled: boolean; maxRepeats: number };
    badWords: string[];
    whitelistRoleIds: string[];
    whitelistChannelIds: string[];
    punishment: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
    muteRoleId?: string;
    punishments: {
      antiInvite?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
      antiLink?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
      antiSpam?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
      antiMention?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
      antiCaps?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
      antiRepeat?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
      badWords?: "delete" | "warn" | "mute" | "kick" | "ban" | "timeout";
    };
    timeoutDurations: {
      antiInvite?: number; // in minutes
      antiLink?: number;
      antiSpam?: number;
      antiMention?: number;
      antiCaps?: number;
      antiRepeat?: number;
      badWords?: number;
    };
  };

  moderation: {
    autoDeleteConfirmation: number; // بالثواني، 0 يعني لا تحذف، الافتراضي 3
  };

  jail: {
    enabled: boolean;
    roleId: string; // The jail role to give
    removeRoles: string[]; // Roles to remove when jailing
    allowAdminBypass: boolean; // Allow admins to bypass jail check
  };

  antiNuke: {
    enabled: boolean;
    maxBans: number;
    maxKicks: number;
    maxChannelDeletes: number;
    maxChannelCreates: number;
    maxRoleDeletes: number;
    maxRoleCreates: number;
    timeWindowSeconds: number;
    punishment: "stripRoles" | "ban" | "kick";
    logChannelId?: string;
    whitelistUserIds: string[];
  };

  captcha: {
    enabled: boolean;
    type: "button";
    verifiedRoleId?: string;
    unverifiedRoleId?: string;
    channelId?: string;
    kickAfterMinutes: number;
    messageId?: string;
  };

  commandOverrides: ICommandOverride[];

  /** عداد الأعضاء: روم صوتي يُعاد تسميته تلقائيًا بعدد أعضاء السيرفر/المتصلين */
  memberCounter: {
    enabled: boolean;
    channelId?: string;
    /** قالب الاسم — {count} = عدد الأعضاء، {online} = عدد المتصلين */
    format: string;
  };

  /** رسائل مجدولة تُرسل تلقائيًا حسب الوقت */
  scheduledMessages: IScheduledMessage[];

  /** نظام الأذكار والمحتوى الإسلامي (مستقل — يمكن تشغيله وإيقافه) */
  islamicContent: IIslamicContent;

  /** رولات الرياكشن: منح/إزالة رتبة عند الرياكشن على رسالة */
  reactionRoles: {
    enabled: boolean;
    channelId?: string;
    messageId?: string;
    title?: string;
    description?: string;
    roles: IReactionRole[];
  };

  /** نظام حظر GIFs: حظر روابط GIF محددة مع إجراءات تلقائية */
  gifBlock: {
    enabled: boolean;
    logChannelId?: string;
    whitelistRoleIds: string[];
    whitelistChannelIds: string[];
  };

  /** نظام الاقتراحات والتصويت */
  suggestions: {
    enabled: boolean;
    channelId: string | null;
    logChannelId: string | null;
    allowVoting: boolean;
    autoThread: boolean;
    backgroundImage?: string;
    imageTitle?: string;
    imageTitleColor?: string;
    usernameColor?: string;
    tagColor?: string;
    contentColor?: string;
    footerText?: string;
    footerColor?: string;
  };

  /** إعدادات صلاحيات لوحة التحكم (اختيارية — تُقرأ بالقيم الافتراضية عند غيابها) */
  dashboard?: IGuildDashboardSettings;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * قراءة الإعدادات مع القيم الافتراضية الآمنة — تُستدعى بدل الوصول المباشر
 * لقابلية التوافق مع المستندات القديمة التي لا تحتوي على الحقل.
 */
export function resolveDashboardSettings(
  config?: Pick<IGuildConfig, "dashboard"> | null
): IGuildDashboardSettings {
  const dashboard = config?.dashboard;
  return {
    allowAdministrators: dashboard?.allowAdministrators ?? true,
    roles: Array.isArray(dashboard?.roles) ? dashboard.roles : []
  };
}

function defaultCustomMessage(): ICustomMessage {
  return {
    enabled: true,
    content: "",
    embed: {
      enabled: false,
      title: "",
      description: "",
      color: "#5865F2",
      thumbnail: true,
      image: "",
      footer: "",
      author: ""
    },
    buttons: []
  };
}

/** القيم الافتراضية الكاملة لإعدادات أي سيرفر جديد (تُستخدم عند إنشاء مستند GuildConfig لأول مرة) */
export function createDefaultGuildConfig(guildId: string): IGuildConfig {
  const now = new Date();
  return {
    guildId,
    prefix: "!",
    language: "ar",

    tickets: {
      enabled: false,
      panelStyle: "buttons",
      saveTranscriptAsHtml: true,
      maxOpenPerUser: 1,
      categories: []
    },

    tempVoice: {
      enabled: false,
      defaultUserLimit: 0,
      nameTemplate: "روم {user}"
    },

    alwaysVoice: {
      enabled: false
    },

    colors: {
      enabled: false,
      roles: []
    },

    welcome: {
      enabled: false,
      sendInDm: false,
      message: defaultCustomMessage(),
      imageEnabled: true
    },

    leave: {
      enabled: false,
      message: defaultCustomMessage(),
      imageEnabled: true
    },

    autoResponses: [],

    autoRole: {
      enabled: false,
      userRoleIds: [],
      botRoleIds: []
    },

    selfRoles: [],

    leveling: {
      enabled: false,
      xpPerMessage: { min: 15, max: 25 },
      xpPerVoiceMinute: 10,
      messageCooldownSeconds: 60,
      levelUpMessage: defaultCustomMessage(),
      announceInChannel: true,
      roleRewards: [],
      ignoredChannelIds: [],
      ignoredRoleIds: []
    },

    logging: {
      enabled: false,
      channels: {},
      customChannels: {}
    },

    jail: {
      enabled: false,
      roleId: "",
      removeRoles: [],
      allowAdminBypass: true
    },

    automod: {
      enabled: false,
      antiInvite: false,
      antiLink: false,
      antiSpam: { enabled: false, maxMessages: 5, perSeconds: 5 },
      antiMention: { enabled: false, maxMentions: 5 },
      antiCaps: { enabled: false, percentThreshold: 70, minLength: 10 },
      antiRepeat: { enabled: false, maxRepeats: 4 },
      badWords: [],
      whitelistRoleIds: [],
      whitelistChannelIds: [],
      punishment: "delete",
      punishments: {},
      timeoutDurations: {}
    },

    moderation: {
      autoDeleteConfirmation: 3
    },

    antiNuke: {
      enabled: false,
      maxBans: 3,
      maxKicks: 3,
      maxChannelDeletes: 3,
      maxChannelCreates: 3,
      maxRoleDeletes: 3,
      maxRoleCreates: 3,
      timeWindowSeconds: 10,
      punishment: "stripRoles",
      whitelistUserIds: []
    },

    captcha: {
      enabled: false,
      type: "button",
      kickAfterMinutes: 10
    },

    commandOverrides: [],

    memberCounter: {
      enabled: false,
      format: "الأعضاء: {count}"
    },

    scheduledMessages: [],

    islamicContent: {
      enabled: false,
      channelId: null,
      intervalMinutes: 60,
      contentTypes: ["quran", "hadith", "azkar"],
      allowedSources: ["Bukhari", "Muslim"],
      azkarCategories: ["أذكار الصباح", "أذكار المساء", "أذكار النوم"],
      antiRepeatMinutes: 180,
      recentlySent: []
    },

    reactionRoles: {
      enabled: false,
      roles: []
    },

    gifBlock: {
      enabled: false,
      whitelistRoleIds: [],
      whitelistChannelIds: []
    },

    suggestions: {
      enabled: false,
      channelId: null,
      logChannelId: null,
      allowVoting: true,
      autoThread: false,
      backgroundImage: "",
      imageTitle: "اقتراح جديد",
      imageTitleColor: "#5865f2",
      usernameColor: "#ffffff",
      tagColor: "#b9bbbe",
      contentColor: "#ffffff",
      footerText: "استخدم الأزرار أدناه للتصويت",
      footerColor: "#b9bbbe"
    },

    dashboard: {
      allowAdministrators: true,
      roles: []
    },

    createdAt: now,
    updatedAt: now
  };
}
