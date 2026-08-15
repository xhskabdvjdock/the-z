import {
  ActionRowBuilder,
  EmbedBuilder,
  Message,
  TextBasedChannel
} from "discord.js";

/** حالة دورة حياة الجلسة — حسب مواصفة The Z Games */
export type GameStatus =
  | "CREATED"
  | "LOBBY"
  | "STARTING"
  | "PLAYING"
  | "ROUND"
  | "RESULT"
  | "FINISHED"
  | "CANCELLED"
  | "EXPIRED";

/** لاعب داخل الجلسة */
export interface GamePlayer {
  id: string;
  tag: string;
  username: string;
  avatarURL: string;
  joinedAt: number;
  ready: boolean;
  /** نتيجة اللاعب داخل هذه الجولة (Score) — منفصل عن نقاط الموسم */
  score: number;
  /** للألعاب ذات الإقصاء */
  alive: boolean;
  /** بيانات حرّة خاصة باللعبة (دور المافيا، قنبلة الروليت...) */
  data: Record<string, any>;
}

/** إجراء قادم من زر/قائمة أو نص */
export interface GameAction {
  /** نوع الإجراء (cell/letter/vote/choice...) */
  type: string;
  /** قيمة الإجراء (رقم الخانة، الحرف، الاسم...) */
  value: string;
  playerId: string;
  round?: number;
}

/** ناتج العرض (Embeds + أزرار/قوائم) يُطبَّق على رسالة الجلسة */
export interface GameRender {
  content?: string;
  embeds: EmbedBuilder[];
  rows: ActionRowBuilder<any>[];
}

/** نتيجة الجولة — تُمرَّر لنظام الإحصاءات */
export interface GameResult {
  /** معرّفات اللاعبين الفائزين */
  winners: string[];
  draw?: boolean;
  /** النتيجة النهائية لكل لاعب (Score) */
  scores: Record<string, number>;
  /** ملخص نصي يُعرض في إيمبد النتيجة */
  summary?: string;
  /** تجاوز نقاط الموسم لكل لاعب (اختياري) */
  pointsOverride?: Record<string, number>;
}

/** تعريف لعبة — تنفيذ الحركات والعرض، والباقي يعتني به المحرك */
export interface GameDefinition<D = any> {
  /** اسم الأمر (مثال "xo") — يُستخدم مع البادئة: -xo */
  name: string;
  /** أسماء مستعارة للبحث في الـ Registry */
  aliases: string[];
  /** العنوان العربي للعرض */
  title: string;
  description: string;
  /** شرح طريقة اللعب (يُعرض في مركز الألعاب) */
  instructions: string;
  category: "multiplayer" | "singleplayer";
  minPlayers: number;
  maxPlayers: number;
  /** هل تدعم اللعب عبر السيرفرات (Cross-Guild)؟ */
  supportsCrossGuild?: boolean;
  /** وصف تقريبي للمدة */
  durationLabel: string;
  /** برودة ثانية بين مباريات نفس اللاعب */
  cooldownSeconds?: number;

  /** تحليل وسائط إضافية من الأمر (مثال: كلمة اللعبة في -hangman). يُرجع نص خطأ إن كانت الوسائط غير صالحة */
  parseArgs?(args: string[], session: GameSession): Promise<string | null> | string | null;

  /** بدء اللعب الفعلي بعد اكتمال الـ Lobby */
  onStart(session: GameSession): void | Promise<void>;
  /** معالجة إجراء لاعب */
  onAction(session: GameSession, action: GameAction): void | Promise<void>;
  /** بناء واجهة اللعبة الحالية */
  render(session: GameSession): GameRender;
  /** حدث مؤقت (مهلة الجولة، مراحل الليل/النهار...) */
  onTimer?(session: GameSession, tag: string): void | Promise<void>;
  /** يُستدعى عند الانتهاء — يمكن للعبة إلغاء ناتج العرض الافتراضي */
  renderResult?(session: GameSession, result: GameResult): GameRender;
}

/** كائن يستخدمه المحرك داخل الجلسة (يمرر للـ GameDefinition) */
export interface GameSession {
  id: string;
  def: GameDefinition;
  status: GameStatus;
  phase: string;
  round: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  hostId: string;
  hostTag: string;
  players: GamePlayer[];
  turnPlayerId: string | null;
  startedAt: number;
  gameData: any;
  crossGuild?: {
    code: string;
    remoteChannels: { guildId: string; channelId: string; messageId: string | null }[];
  };

  /* — أدوات يقدمها المحرك للألعاب — */
  getPlayer(id: string): GamePlayer | undefined;
  alivePlayers(): GamePlayer[];
  isTurn(id: string): boolean;
  setTurn(id: string | null): void;
  /** إعادة عرض رسالة الجلسة فورًا */
  renderNow(): Promise<void>;
  /** إرسال رسالة منفصلة للقناة */
  notify(content: string, embeds?: EmbedBuilder[], rows?: ActionRowBuilder<any>[]): Promise<Message | null>;
  /** إرسال رسالة خاصة للاعب (للأدوار السرية في المافيا) */
  dm(
    userId: string,
    embeds: EmbedBuilder[],
    rows?: ActionRowBuilder<any>[]
  ): Promise<Message | null>;
  /** إنهاء الجولة بالنتيجة (يسجّل الإحصاء ويحذف الجلسة) */
  finish(result: GameResult): Promise<void>;
  /** إلغاء الجلسة */
  cancel(reason: string): Promise<void>;
  /** انتهاء الجلسة بانتهاء المهلة */
  expire(reason: string): Promise<void>;
  /** مؤقت مرتبط بالجلسة — يُلغى تلقائيًا عند الانتهاء */
  setTimer(tag: string, ms: number, cb: () => void): void;
  clearTimer(tag: string): void;
  clearTimers(): void;
  /** انتظار مدة — يُلغى (يُرجع null) إذا انتهت الجلسة قبلها */
  wait(ms: number): Promise<null>;
  /** جمع نصوص/إجابات من القناة ضمن مهلة */
  awaitText(
    opts: { time: number; max?: number; filter?: (msg: Message) => boolean }
  ): Promise<Message[]>;
  getChannel(): Promise<TextBasedChannel | null>;
}