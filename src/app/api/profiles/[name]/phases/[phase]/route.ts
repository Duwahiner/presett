import { NextResponse } from "next/server";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "DELETE, GET, OPTIONS, PUT",
      "Access-Control-Allow-Methods": "DELETE, GET, OPTIONS, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Phase assignment is retired: it depended on
 * `gentle-ai sync --profile-phase`, which Gentle-AI removed on purpose. The
 * handler answers 410 right after the origin check, before validating the path
 * segments, reading the config, loading the catalog or spawning a process.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string; phase: string }> },
) {
  void params;
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "FEATURE_RETIRED",
        message:
          "Assigning profile phases is no longer available: Gentle-AI retired the profile flags.",
      },
    },
    { status: 410 },
  );
}
