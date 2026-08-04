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

export interface IAutoResponse {
  id: string;
  trigger: string;
  matchType: "exact" | "contains" | "startsWith" | "regex";
  responses: ICustomMessage[];
  response?: ICustomMessage; // Deprecated: use responses instead
  channelIds: string[];
  enabled: boolean;
  deleteTrigger: boolean;
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

  colors: {
    enabled: boolean;
    panelChannelId?: string;
    panelMessageId?: string;
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
    };
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

  createdAt: Date;
  updatedAt: Date;
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

    createdAt: now,
    updatedAt: now
  };
}
