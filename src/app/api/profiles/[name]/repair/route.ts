import { NextResponse } from "next/server";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "OPTIONS, POST",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Profile repair is retired: it depended on `gentle-ai sync --profile`, which
 * Gentle-AI removed on purpose. The handler answers 410 right after the origin
 * check, before validating the name, reading the config, writing a backup or
 * spawning a process.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
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
          "Repairing profiles is no longer available: Gentle-AI retired the profile flags.",
      },
    },
    { status: 410 },
  );
}
