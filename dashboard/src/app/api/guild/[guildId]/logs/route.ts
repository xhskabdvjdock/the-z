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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    const limit = Math.min(Math.max(parseInt(limitRaw || "100", 10) || 100, 1), 200);
    const offset = Math.max(parseInt(offsetRaw || "0", 10) || 0, 0);

    const filter: any = { guildId: params.guildId };
    if (type && type !== "all") {
      filter.type = type;
    }

    let logs: any[] = await LogEntry.find(filter).sort({ createdAt: -1 }).limit(limit + offset);

    // apply offset in memory (collection wrapper does not support skip)
    logs = logs.slice(offset, offset + limit);

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (log: any) =>
          log.action?.toLowerCase().includes(q) ||
          log.type?.toLowerCase().includes(q) ||
          log.executorTag?.toLowerCase().includes(q) ||
          log.targetTag?.toLowerCase().includes(q) ||
          log.reason?.toLowerCase().includes(q) ||
          log.channelName?.toLowerCase().includes(q) ||
          log.roleName?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const access = await requireApiGuild(params.guildId);
    if (!access.ok) return access.response;
    await connectDatabase(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    if (before) {
      const date = new Date(before);
      // delete old logs - manual filter due to collection wrapper
      const all = await LogEntry.find({ guildId: params.guildId });
      for (const log of all) {
        if (new Date((log as any).createdAt) < date) {
          await LogEntry.deleteOne({ _id: (log as any)._id } as any).catch(() => null);
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 });
  }
}
