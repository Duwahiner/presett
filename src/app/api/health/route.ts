import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "presett",
    timestamp: new Date().toISOString(),
  });
}
