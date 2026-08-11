import { spawn } from "node:child_process";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

export interface SyncResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runGentleAiSync(
  command: string = "gentle-ai",
): Promise<Result<SyncResult>> {
  return new Promise((resolve) => {
    const child = spawn(command, ["sync"]);
    let stdout = "";
    let stderr = "";
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      child.kill();
    }, 120_000);

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    child.on("error", (cause) => {
      clearTimeout(timeout);
      resolve(
        err({
          code: "FILE_MISSING",
          message: `Failed to start ${command}: ${cause.message}`,
          cause,
        }),
      );
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      if (killed) {
        resolve(
          err({
            code: "ATOMIC_WRITE_FAILED",
            message: "gentle-ai sync timed out after 120s",
          }),
        );
        return;
      }

      resolve(
        ok({
          exitCode: exitCode ?? -1,
          stdout,
          stderr,
        }),
      );
    });
  });
}
