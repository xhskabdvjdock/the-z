import { NextRequest, NextResponse } from "next/server";
import { isSnowflakeId } from "@thez/shared";
import { requireApiGuild } from "@/lib/apiAuth";
import { apiRateLimiter } from "@/lib/rateLimit";
import { botHeaders } from "@/lib/discord";

const MAX_REASON_LENGTH = 512;

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
    return NextResponse.json({ error: "لا يمكنك طرد نفسك" }, { status: 400 });
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

  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  let reason: string | undefined;
  if (body.reason != null) {
    if (typeof body.reason !== "string" || body.reason.trim().length > MAX_REASON_LENGTH) {
      return NextResponse.json({ error: "السبب غير صالح (أقصى 512 حرفاً)" }, { status: 400 });
    }
    reason = body.reason.trim() || undefined;
  }

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/members/${params.userId}`);
  const bodyData = reason ? { reason } : undefined;

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...botHeaders()
    },
    body: bodyData ? JSON.stringify(bodyData) : undefined
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[api/guild/kick] Discord error ${res.status}: ${text.slice(0, 200)}`);
    return NextResponse.json({ error: "فشل طرد العضو" }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}