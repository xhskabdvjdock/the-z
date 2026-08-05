import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { guildId: string } }) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${params.guildId}/roles`, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
    }
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
