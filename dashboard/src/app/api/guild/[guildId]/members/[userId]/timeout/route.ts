import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const body = await request.json();
  const { duration, reason } = body;

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/members/${params.userId}`);
  const bodyData: any = {
    communication_disabled_until: new Date(Date.now() + duration * 1000).toISOString()
  };
  if (reason) bodyData.reason = reason;

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify(bodyData)
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to timeout member" }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}
