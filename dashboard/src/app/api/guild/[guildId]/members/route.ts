import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { guildId: string } }) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const after = searchParams.get("after") || undefined;

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/members`);
  url.searchParams.append("limit", limit.toString());
  if (after) {
    url.searchParams.append("after", after);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
    }
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
