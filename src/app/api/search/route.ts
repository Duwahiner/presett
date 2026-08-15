import { NextResponse } from "next/server";
import { buildSafeError } from "@/lib/localApiSecurity";
import { searchEntities } from "@/services/searchService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === null ? undefined : Number(limitParam);
  if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
    return NextResponse.json(buildSafeError("Invalid search limit"), { status: 400 });
  }

  const response = await searchEntities({
    query: url.searchParams.get("q") ?? "",
    limit,
  });
  return NextResponse.json(response);
}
