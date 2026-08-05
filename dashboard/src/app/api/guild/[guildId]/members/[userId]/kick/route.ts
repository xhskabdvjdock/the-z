import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const body = await request.json();
  const { reason } = body;

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/members/${params.userId}`);
  const bodyData = reason ? { reason } : undefined;

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
    },
    body: bodyData ? JSON.stringify(bodyData) : undefined
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to kick member" }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}
