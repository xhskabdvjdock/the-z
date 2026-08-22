import { NextRequest, NextResponse } from "next/server";
import { isSnowflakeId } from "@thez/shared";
import { requireApiGuild } from "@/lib/apiAuth";
import { apiRateLimiter } from "@/lib/rateLimit";
import { botHeaders } from "@/lib/discord";

export async function GET(request: NextRequest, { params }: { params: { guildId: string } }) {
  const access = await requireApiGuild(params.guildId);
  if (!access.ok) return access.response;

  const rate = apiRateLimiter.check(`${access.userId}:${params.guildId}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "طلبات كثيرة — حاول لاحقاً" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const after = searchParams.get("after") || undefined;

  const limit = limitRaw ? Number(limitRaw) : 100;
  if (!Number.isFinite(limit) || limit < 1 || limit > 1000) {
    return NextResponse.json({ error: "limit must be between 1 and 1000" }, { status: 400 });
  }
  if (after !== undefined && !isSnowflakeId(after)) {
    return NextResponse.json({ error: "معرّف after غير صالح" }, { status: 400 });
  }

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/members`);
  url.searchParams.append("limit", String(Math.trunc(limit)));
  if (after) url.searchParams.append("after", after);

  const res = await fetch(url.toString(), {
    headers: botHeaders(),
    cache: "no-store"
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}