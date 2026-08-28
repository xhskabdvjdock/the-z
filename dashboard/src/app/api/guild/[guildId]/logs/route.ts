import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@thez/shared";
import { LogEntry } from "@thez/shared/models";
import { requireApiGuild } from "@/lib/apiAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const access = await requireApiGuild(params.guildId);
    if (!access.ok) return access.response;

    await connectDatabase(process.env.DATABASE_URL!);

    const logs = await LogEntry.find({ guildId: params.guildId })
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}