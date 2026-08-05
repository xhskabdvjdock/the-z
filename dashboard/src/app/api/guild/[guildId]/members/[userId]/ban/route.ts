import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const body = await request.json();
  const { reason, deleteMessageDays } = body;

  const url = new URL(`https://discord.com/api/v10/guilds/${params.guildId}/bans/${params.userId}`);
  const bodyData: any = {};
  if (reason) bodyData.reason = reason;
  if (deleteMessageDays) bodyData.delete_message_days = deleteMessageDays;

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify(bodyData)
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to ban member" }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}
