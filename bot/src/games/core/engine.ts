import {
  ActionRowBuilder,
  EmbedBuilder,
  Message,
  TextBasedChannel
} from "discord.js";
import { GameSessionRecord } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { config } from "../../config";
import { logError, logInfo } from "../../utils/logger";
import { recordGameResult } from "../stats/stats";
import {
  GameAction,
  GameDefinition,
  GamePlayer,
  GameRender,
  GameResult,
  GameSession,
  GameStatus
} from "./types";

/** حالة نهائية — أي إجراء بعدها يُتجاهل */
const TERMINAL: GameStatus[] = ["FINISHED", "CANCELLED", "EXPIRED"];

/** انتقالات الحالة المسموحة — الحالة "المنطقية" للعبة (phase) حرّة داخل الألعاب */
const TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  CREATED: ["LOBBY", "STARTING", "PLAYING", "CANCELLED", "EXPIRED", "FINISHED"],
  LOBBY: ["STARTING", "CANCELLED", "EXPIRED", "PLAYING"],
  STARTING: ["PLAYING", "CANCELLED", "EXPIRED", "FINISHED"],
  PLAYING: ["ROUND", "RESULT", "FINISHED", "CANCELLED", "EXPIRED"],
  ROUND: ["PLAYING", "RESULT", "FINISHED", "CANCELLED", "EXPIRED"],
  RESULT: ["FINISHED", "PLAYING", "CANCELLED", "EXPIRED"],
  FINISHED: [],
  CANCELLED: [],
  EXPIRED: []
};

function canTransition(from: GameStatus, to: GameStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** عداد أرقام/حروف مؤقتة لمفاتيح جلسات فريدة */
let seq = 0;
function nextSessionId(): string {
  seq = (seq + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** كود لعب مشترك للـ Cross-Guild */
function genCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** يحوّل GameRender إلى حمولة رسالة Discord */
export function buildMessageOptions(render: GameRender) {
  return {
    content: render.content ?? "",
    embeds: render.embeds,
    components: render.rows.length ? render.rows : []
  };
}

export function defaultResultEmbed(def: GameDefinition, result: GameResult): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(`نتيجة ${def.title}`)
    .setDescription(result.summary ?? "");

  const lines = result.winners
    .map((id, i) => `${i + 1}. <@${id}>`)
    .join("\n");
  if (result.draw) {
    embed.addFields({ name: "النتيجة", value: "تعادل", inline: false });
  } else if (result.winners.length) {
    embed.addFields({ name: "الفائزون", value: lines, inline: false });
  }

  const scores = Object.entries(result.scores)
    .sort((a, b) => b[1] - a[1])
    .map(([id, s]) => `<@${id}> — **${s}** نقطة`);
  if (scores.length) embed.addFields({ name: "النقاط", value: scores.join("\n"), inline: false });

  return embed;
}

interface RemoteChannel {
  guildId: string;
  channelId: string;
  messageId: string | null;
}

/**
 * جلسة اللعبة — الحالة الكاملة لمباراة واحدة.
 * تنفيذ واجهة GameSession التي تراها الألعاب.
 */
export class GameSessionImpl implements GameSession {
  id: string;
  def: GameDefinition;
  status: GameStatus = "CREATED";
  phase = "idle";
  round = 0;
  guildId: string;
  channelId: string;
  messageId: string | null = null;
  hostId: string;
  hostTag: string;
  players: GamePlayer[] = [];
  turnPlayerId: string | null = null;
  startedAt: number = Date.now();
  gameData: any = {};
  crossGuild?: { code: string; remoteChannels: RemoteChannel[] };

  private timers = new Map<string, NodeJS.Timeout>();
  private pendingWaits: ((v: null) => void)[] = [];
  private remote: RemoteChannel[] = [];
  private actionChain: Promise<void> = Promise.resolve();

  constructor(
    private client: ExtendedClient,
    def: GameDefinition,
    opts: {
      guildId: string;
      channelId: string;
      hostId: string;
      hostTag: string;
      crossGuild?: boolean;
    }
  ) {
    this.def = def;
    this.guildId = opts.guildId;
    this.channelId = opts.channelId;
    this.hostId = opts.hostId;
    this.hostTag = opts.hostTag;
    this.id = nextSessionId();
    if (opts.crossGuild) {
      this.crossGuild = { code: genCode(), remoteChannels: [] };
    }
  }

  /* ─────────────── لاعبون ─────────────── */

  getPlayer(id: string): GamePlayer | undefined {
    return this.players.find((p) => p.id === id);
  }

  alivePlayers(): GamePlayer[] {
    return this.players.filter((p) => p.alive);
  }

  isTurn(id: string): boolean {
    return this.turnPlayerId === id;
  }

  setTurn(id: string | null): void {
    this.turnPlayerId = id;
  }

  /* ─────────────── رسائل ─────────────── */

  async getChannel(): Promise<TextBasedChannel | null> {
    const ch = await this.client.channels.fetch(this.channelId).catch(() => null);
    if (ch && "isTextBased" in ch && ch.isTextBased()) return ch as TextBasedChannel;
    return null;
  }

  /** إرسال أو تعديل رسالة جلسة في قناة معينة (يعيد إرسالها لو حُذفت) */
  private async editOrSend(target: {
    guildId: string;
    channelId: string;
    messageId: string | null;
    isHost: boolean;
  }): Promise<boolean> {
    const payload = buildMessageOptions(this.def.render(this));
    const channel = await this.client.channels.fetch(target.channelId).catch(() => null);
    if (!channel || !("isTextBased" in channel) || !channel.isTextBased()) return false;

    const text = channel as TextBasedChannel;
    if (target.messageId) {
      const msg = await text.messages.fetch(target.messageId).catch(() => null);
      if (msg) {
        try {
          await msg.edit(payload);
          return true;
        } catch {
          /* تابع — قد يكون التعديل فشل */
        }
      }
      // الرسالة اختفت أو فشل التعديل — إعادة إرسال إن لم تكن رسالة المضيف
      if (target.isHost) {
        this.cancel("اختفت رسالة اللعبة من الروم.").catch(() => null);
        return false;
      }
      target.messageId = null;
    }
    const sent = await (text as any).send(payload).catch(() => null);
    if (sent) {
      target.messageId = sent.id;
      return true;
    }
    return false;
  }

  async renderNow(): Promise<void> {
    if (TERMINAL.includes(this.status)) return;
    // المضيف
    await this.editOrSend({
      guildId: this.guildId,
      channelId: this.channelId,
      messageId: this.messageId,
      isHost: true
    });
    // قنوات السيرفرات الأخرى (Cross-Guild)
    for (const remote of this.remote) {
      await this.editOrSend({ ...remote, isHost: false });
    }
    if (this.crossGuild) this.crossGuild.remoteChannels = this.remote;
  }

  async notify(
    content: string,
    embeds: EmbedBuilder[] = [],
    rows: ActionRowBuilder<any>[] = []
  ): Promise<Message | null> {
    const channel = await this.getChannel();
    if (!channel) return null;
    return (channel as any).send({ content, embeds, components: rows }).catch(() => null);
  }

  async dm(
    userId: string,
    embeds: EmbedBuilder[],
    rows: ActionRowBuilder<any>[] = []
  ): Promise<Message | null> {
    const user = await this.client.users.fetch(userId).catch(() => null);
    if (!user) return null;
    return user.send({ embeds, components: rows }).catch(() => null);
  }

  /** تسجيل قناة سيرفر آخر لعرض اللعبة فيها (Cross-Guild) */
  addRemoteChannel(guildId: string, channelId: string): void {
    const exists = this.remote.some(
      (r) => r.guildId === guildId && r.channelId === channelId
    );
    if (!exists) this.remote.push({ guildId, channelId, messageId: null });
  }

  /* ─────────────── مؤقتات ─────────────── */

  setTimer(tag: string, ms: number, cb: () => void): void {
    this.clearTimer(tag);
    const handle = setTimeout(() => {
      this.timers.delete(tag);
      if (TERMINAL.includes(this.status)) return;
      cb();
    }, ms);
    this.timers.set(tag, handle);
  }

  clearTimer(tag: string): void {
    const h = this.timers.get(tag);
    if (h) {
      clearTimeout(h);
      this.timers.delete(tag);
    }
  }

  clearTimers(): void {
    for (const h of this.timers.values()) clearTimeout(h);
    this.timers.clear();
  }

  wait(ms: number): Promise<null> {
    return new Promise<null>((resolve) => {
      this.pendingWaits.push(resolve);
      setTimeout(() => {
        const i = this.pendingWaits.indexOf(resolve);
        if (i !== -1) this.pendingWaits.splice(i, 1);
        if (!TERMINAL.includes(this.status)) resolve(null);
        else resolve(null);
      }, ms);
    });
  }

  async awaitText(opts: {
    time: number;
    max?: number;
    filter?: (msg: Message) => boolean;
  }): Promise<Message[]> {
    const channel = await this.getChannel();
    if (!channel || !("awaitMessages" in channel)) return [];
    const { time, max = 1, filter } = opts;
    const baseFilter = (msg: Message) => !msg.author.bot && msg.channelId === this.channelId;
    const combined = filter ? (msg: Message) => baseFilter(msg) && filter(msg) : baseFilter;
    try {
      const collected = await (channel as any).awaitMessages({
        filter: combined,
        time,
        max,
        errors: ["time"]
      });
      return [...collected.values()];
    } catch {
      return [];
    }
  }

  /* ─────────────── إنهاء/إلغاء ─────────────── */

  async finish(result: GameResult): Promise<void> {
    if (TERMINAL.includes(this.status)) return;
    this.status = "RESULT";
    this.clearTimers();
    this.resolveWaits();

    const render =
      this.def.renderResult?.(this, result) ?? {
        content: "",
        embeds: [defaultResultEmbed(this.def, result)],
        rows: []
      };
    const payload = buildMessageOptions(render);
    await this.editAll(payload);

    // سجّل الإحصاءات بعد العرض (خطأه لا يُسقط الجلسة)
    recordGameResult(this, result).catch((err) =>
      logError("games/recordResult", err)
    );

    await this.deleteRecord();
    sessionManager.remove(this);
  }

  async cancel(reason: string): Promise<void> {
    if (TERMINAL.includes(this.status)) return;
    this.status = "CANCELLED";
    this.clearTimers();
    this.resolveWaits();
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`تم إلغاء ${this.def.title}`)
      .setDescription(reason);
    await this.editAll({ content: "", embeds: [embed], components: [] });
    await this.deleteRecord();
    sessionManager.remove(this);
  }

  async expire(reason: string): Promise<void> {
    if (TERMINAL.includes(this.status)) return;
    this.status = "EXPIRED";
    this.clearTimers();
    this.resolveWaits();
    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle(`انتهت مهلة ${this.def.title}`)
      .setDescription(reason);
    await this.editAll({ content: "", embeds: [embed], components: [] });
    await this.deleteRecord();
    sessionManager.remove(this);
  }

  /** تعديل كل رسائل الجلسة (مضيف + سيرفرات أخرى) بحمولة ثابتة */
  private async editAll(payload: {
    content: string;
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<any>[];
  }): Promise<void> {
    const targets: { channelId: string; messageId: string | null }[] = [
      { channelId: this.channelId, messageId: this.messageId },
      ...this.remote
    ];
    for (const t of targets) {
      if (!t.messageId) continue;
      const channel = await this.client.channels.fetch(t.channelId).catch(() => null);
      if (!channel || !("isTextBased" in channel) || !channel.isTextBased()) continue;
      const msg = await (channel as TextBasedChannel).messages.fetch(t.messageId).catch(() => null);
      if (msg) msg.edit(payload).catch(() => null);
    }
  }

  private resolveWaits(): void {
    for (const r of this.pendingWaits) r(null);
    this.pendingWaits = [];
  }

  /** تنفيذ إجراء عبر سلسلة وعود — يمنع التداخل داخل نفس الجلسة */
  enqueue(fn: () => Promise<void>): Promise<void> {
    this.actionChain = this.actionChain.then(fn).catch((err) => {
      logError(`games/action/${this.def.name}`, err);
    });
    return this.actionChain;
  }

  /* ─────────────── قاعدة البيانات ─────────────── */

  async writeRecord(): Promise<void> {
    try {
      await GameSessionRecord.create({
        sessionId: this.id,
        guildId: this.guildId,
        channelId: this.channelId,
        messageId: this.messageId ?? "",
        gameName: this.def.name,
        hostId: this.hostId,
        status: this.status
      });
    } catch (err) {
      logError("games/writeRecord", err);
    }
  }

  async deleteRecord(): Promise<void> {
    try {
      await GameSessionRecord.deleteOne({ sessionId: this.id });
    } catch (err) {
      logError("games/deleteRecord", err);
    }
  }
}

/** إدارة كل الجلسات النشطة (Map + فهرس لاعب → جلسة) */
class SessionManager {
  private sessions = new Map<string, GameSessionImpl>();
  private byPlayer = new Map<string, string>();

  add(session: GameSessionImpl): void {
    this.sessions.set(session.id, session);
    for (const p of session.players) this.byPlayer.set(p.id, session.id);
  }

  get(id: string): GameSessionImpl | undefined {
    return this.sessions.get(id);
  }

  /** جلسة نشطة للاعب — تُستخدم لمنع الدخول في أكثر من لعبة */
  getByPlayer(userId: string): GameSessionImpl | undefined {
    const sid = this.byPlayer.get(userId);
    return sid ? this.sessions.get(sid) : undefined;
  }

  /** جلسة حسب كود اللعب المشترك (Cross-Guild) */
  getByProxyCode(code: string): GameSessionImpl | undefined {
    const c = code.trim().toUpperCase();
    return this.list().find((s) => s.crossGuild?.code === c);
  }

  remove(session: GameSessionImpl): void {
    this.sessions.delete(session.id);
    for (const [u, s] of this.byPlayer) {
      if (s === session.id) this.byPlayer.delete(u);
    }
  }

  list(): GameSessionImpl[] {
    return [...this.sessions.values()];
  }

  activeCount(): number {
    return this.sessions.size;
  }
}

export const sessionManager = new SessionManager();

/** إنشاء جلسة وإضافتها للإدارة (لا تُرسل أي رسالة — تُرسل عند أول renderNow) */
export function createSession(
  client: ExtendedClient,
  def: GameDefinition,
  opts: {
    guildId: string;
    channelId: string;
    hostId: string;
    hostTag: string;
  }
): GameSessionImpl {
  const session = new GameSessionImpl(client, def, {
    ...opts,
    crossGuild: def.supportsCrossGuild === true
  });
  return session;
}

/** بدء اللعب الفعلي — ينتقل من الـ Lobby ويستدعي onStart ثم يعرض */
export async function startGame(session: GameSessionImpl): Promise<boolean> {
  if (!canTransition(session.status, "STARTING")) return false;
  if (session.players.length < session.def.minPlayers) return false;

  session.status = "STARTING";
  for (const p of session.players) {
    p.ready = true;
    p.alive = true;
    p.score = 0;
  }
  session.startedAt = Date.now();
  try {
    await session.def.onStart(session);
  } catch (err) {
    logError(`games/onStart/${session.def.name}`, err);
    await session.cancel("حدث خطأ أثناء بدء اللعبة.");
    return false;
  }
  session.status = "PLAYING";
  await session.renderNow();
  return true;
}

/** معالجة إجراء داخل جلسة — يُستدعى من الأزرار/القوائم */
export async function dispatchAction(
  session: GameSessionImpl,
  action: GameAction,
  def?: GameDefinition
): Promise<void> {
  const d = def ?? session.def;
  await session.enqueue(async () => {
    if (TERMINAL.includes(session.status)) return;
    if (action.playerId && !session.getPlayer(action.playerId)) return;
    try {
      await d.onAction(session, action);
    } catch (err) {
      logError(`games/onAction/${d.name}`, err);
      await session.cancel("حدث خطأ غير متوقع في اللعبة.");
      return;
    }
    // إعادة عرض تلقائية في حالات اللعب فقط — النتائج/الإلغاء تدير عرضها بنفسها
    if (session.status === "PLAYING" || session.status === "ROUND") {
      await session.renderNow();
    }
  });
}

/** استعادة الجلسات بعد إعادة تشغيل البوت — إلغاء المعلّق منها */
export async function recoverStaleSessions(client: ExtendedClient): Promise<void> {
  try {
    const stale = await GameSessionRecord.find({});
    for (const rec of stale) {
      const channel = await client.channels.fetch(rec.channelId).catch(() => null);
      const msg =
        channel && "isTextBased" in channel && channel.isTextBased()
          ? await (channel as TextBasedChannel).messages.fetch(rec.messageId).catch(() => null)
          : null;
      if (msg) {
        const embed = new EmbedBuilder()
          .setColor(0x95a5a6)
          .setTitle(`انتهت جلسة ${rec.gameName}`)
          .setDescription("انتهت الجلسة بسبب إعادة تشغيل البوت.");
        msg.edit({ embeds: [embed], components: [] }).catch(() => null);
      }
      await GameSessionRecord.deleteOne({ sessionId: rec.sessionId });
    }
    if (stale.length) {
      logInfo("games/recover", `تم إغلاق ${stale.length} جلسة معلّقة بعد إعادة التشغيل.`);
    }
  } catch (err) {
    logError("games/recover", err);
  }
}

