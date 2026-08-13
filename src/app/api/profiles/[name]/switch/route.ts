import { join } from "node:path";
import { NextResponse } from "next/server";
import { switchProfile } from "@/adapters/opencode";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";

export const dynamic = "force-dynamic";

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function backupDir(): string {
  return (
    process.env.PRESETT_TEST_BACKUP_DIR ??
    join(defaultPresettDir(), "backups")
  );
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const { name } = await params;
  const result = await switchProfile(configDir(), name, backupDir());

  if (!result.ok) {
    const status = result.error.code === "SCHEMA_INVALID" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
