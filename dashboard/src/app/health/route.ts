import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse("ok", { status: 200 });
}