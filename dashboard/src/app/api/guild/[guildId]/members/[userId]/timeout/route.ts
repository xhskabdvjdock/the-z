import { NextRequest, NextResponse } from "next/server";
import { isSnowflakeId } from "@thez/shared";
import { requireApiGuild } from "@/lib/apiAuth";
import { apiRateLimiter } from "@/lib/rateLimit";
import { botHeaders } from "@/lib/discord";

const MAX_REASON_LENGTH = 512;
/** حد Discord الأقصى لكتم (timeout): 28 يوماً */
const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60;
const MIN_TIMEOUT_SECONDS = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const access = await requireApiGuild(params.guildId);
  if (!access.ok) return access.response;

  if (!isSnowflakeId(params.userId)) {
    return NextResponse.json({ error: "معرّف العضو غير صالح" }, { status: 400 });
  }
  if (params.userId === access.userId) {
    return NextResponse.json({ error: "لا يمكنك كتم نفسك" }, { status: 400 });
  }

  const rate = apiRateLimiter.check(`${access.userId}:${params.guildId}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "طلبات كثيرة جداً — حاول لاحقاً" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) }
      }
    );
  }

  let body: { duration?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const duration = Number(body.duration);
  if (
    !Number.isFinite(duration) ||
    duration < MIN_TIMEOUT_SECONDS ||
    duration > MAX_TIMEOUT_SECONDS
  ) {
    return NextResponse.json(
      { error: `duration يجب أن يكون بين ${MIN_TIMEOUT_SECONDS} ثانية و ${MAX_TIMEOUT_SECONDS} ثانية` },
      { status: 400 }
    );
  }

  let reason: string | undefined;
  if (body.reason != null) {
    if (typeof body.reason !== "string" || body.reason.trim().length > MAX_REASON_LENGTH) {
      return NextResponse.json({ error: "السبب غير صالح (أقصى 512 حرفاً)" }, { status: 400 });
    }
    reason = body.reason.trim() || undefined;
  }

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/members/${params.userId}`);
  const bodyData: any = {
    communication_disabled_until: new Date(Date.now() + Math.trunc(duration) * 1000).toISOString()
  };
  if (reason) bodyData.reason = reason;

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...botHeaders()
    },
    body: JSON.stringify(bodyData)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[api/guild/timeout] Discord error ${res.status}: ${text.slice(0, 200)}`);
    return NextResponse.json({ error: "فشل كتم العضو" }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}