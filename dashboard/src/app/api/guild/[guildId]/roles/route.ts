import { NextRequest, NextResponse } from "next/server";
import { requireApiGuild } from "@/lib/apiAuth";
import { apiRateLimiter } from "@/lib/rateLimit";
import { botHeaders } from "@/lib/discord";

export async function GET(request: NextRequest, { params }: { params: { guildId: string } }) {
  const access = await requireApiGuild(params.guildId);
  if (!access.ok) return access.response;

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

  const res = await fetch(`https://discord.com/api/v10/guilds/${params.guildId}/roles`, {
    headers: botHeaders(),
    cache: "no-store"
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}