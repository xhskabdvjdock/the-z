import { NextRequest, NextResponse } from "next/server";
import { ModerationLog } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireApiGuild } from "@/lib/apiAuth";
import { apiRateLimiter } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

const MAX_LIMIT = 100;
const VALID_ACTIONS = new Set([
  "ban",
  "kick",
  "mute",
  "unmute",
  "warn",
  "unban",
  "clear",
  "lock",
  "unlock",
  "slowmode",
  "jail",
  "unjail",
  "auto"
]);

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const access = await requireApiGuild(params.guildId);
  if (!access.ok) return access.response;

  const rate = apiRateLimiter.check(`${access.userId}:${params.guildId}:logs`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "طلبات كثيرة جداً — حاول لاحقاً" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) }
      }
    );
  }

  const search = new URL(request.url).searchParams;
  const rawLimit = search.get("limit") ?? "50";
  const limit = Number.parseInt(rawLimit, 10);
  const action = search.get("action");
  const userId = search.get("userId");

  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json({ error: `limit بين 1 و ${MAX_LIMIT}` }, { status: 400 });
  }
  if (action && !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "action غير صالح" }, { status: 400 });
  }
  if (userId && !/^\d{17,20}$/.test(userId)) {
    return NextResponse.json({ error: "userId غير صالح" }, { status: 400 });
  }

  try {
    await ensureDb();
    const filter: Record<string, any> = { guildId: params.guildId };
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const logs = await ModerationLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ logs }, { status: 200 });
  } catch (err) {
    logError("api/guild/moderation", err);
    return NextResponse.json({ error: "فشل جلب سجل الإشراف" }, { status: 500 });
  }
}