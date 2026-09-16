import { Suggestion } from "@thez/shared";
import { logError } from "../../utils/logger";
import { recordDbRead, recordDbWrite, recordSuggestionVote } from "../../utils/metrics";

/**
 * حالة التصويت في الذاكرة — الضغطات المتتالية تُجمَّع وتُحفَظ دفعة واحدة
 * بدل قراءة/كتابة كامل المصفوفتين مع كل ضغطة.
 */

interface VoteState {
  up: Set<string>;
  down: Set<string>;
  status: string;
  dirty: boolean;
  timer: NodeJS.Timeout | null;
}

/** حد أعلى للإدخالات — يُطرَد الأنظف أولًا عند التجاوز */
const MAX_ENTRIES = 500;
/** تأخير الحفظ الدفعي بعد آخر ضغطة */
const PERSIST_DELAY_MS = 3_000;

const states = new Map<string, VoteState>();

function evictIfNeeded(): void {
  if (states.size <= MAX_ENTRIES) return;
  for (const [id, state] of states) {
    if (!state.dirty) {
      if (state.timer) clearTimeout(state.timer);
      states.delete(id);
      if (states.size <= MAX_ENTRIES) break;
    }
  }
}

async function loadState(suggestionId: string): Promise<VoteState | null> {
  const existing = states.get(suggestionId);
  if (existing) return existing;

  recordDbRead();
  const suggestion = await Suggestion.findOne({ id: suggestionId });
  if (!suggestion) return null;

  const state: VoteState = {
    up: new Set(suggestion.upvotes ?? []),
    down: new Set(suggestion.downvotes ?? []),
    status: suggestion.status ?? "pending",
    dirty: false,
    timer: null
  };
  states.set(suggestionId, state);
  evictIfNeeded();
  return state;
}

async function persist(suggestionId: string): Promise<void> {
  const state = states.get(suggestionId);
  if (!state || !state.dirty) return;
  state.dirty = false;
  state.timer = null;
  try {
    recordDbWrite();
    await Suggestion.findOneAndUpdate(
      { id: suggestionId },
      {
        $set: {
          upvotes: [...state.up],
          downvotes: [...state.down],
          updatedAt: new Date().toISOString()
        }
      }
    );
  } catch (err) {
    state.dirty = true;
    logError("suggestions/vote-persist", err);
  }
}

function schedulePersist(suggestionId: string): void {
  const state = states.get(suggestionId);
  if (!state) return;
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    void persist(suggestionId);
  }, PERSIST_DELAY_MS);
  state.timer.unref?.();
}

export interface VoteResult {
  found: boolean;
  upCount: number;
  downCount: number;
  status?: string;
}

/**
 * تبديل تصويت مستخدم — قراءة DB مرة واحدة فقط عند أول ضغطة (cache miss)،
 * والحفظ دفعي. يعيد الأعداد الحالية للعرض الفوري.
 */
export async function toggleVote(
  suggestionId: string,
  userId: string,
  type: "up" | "down"
): Promise<VoteResult> {
  const state = await loadState(suggestionId);
  if (!state) return { found: false, upCount: 0, downCount: 0 };

  const isUp = type === "up";
  if (isUp) {
    if (state.up.has(userId)) state.up.delete(userId);
    else {
      state.up.add(userId);
      state.down.delete(userId);
    }
  } else {
    if (state.down.has(userId)) state.down.delete(userId);
    else {
      state.down.add(userId);
      state.up.delete(userId);
    }
  }

  state.dirty = true;
  schedulePersist(suggestionId);
  recordSuggestionVote();

  return {
    found: true,
    upCount: state.up.size,
    downCount: state.down.size,
    status: state.status
  };
}

/** تفريغ كل المعلَّق — يُستدعى عند الإغلاق الآمن */
export async function flushVotes(): Promise<void> {
  const ids = [...states.keys()];
  for (const id of ids) {
    const state = states.get(id);
    if (state?.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    await persist(id).catch((err) => logError("suggestions/vote-flush", err));
  }
}

/** للاختبار والمراقبة */
export function voteStateCount(): number {
  return states.size;
}

export function clearVoteState(): void {
  for (const state of states.values()) {
    if (state.timer) clearTimeout(state.timer);
  }
  states.clear();
}
