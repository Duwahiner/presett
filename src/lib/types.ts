export type ConfigErrorCode =
  | "FILE_MISSING"
  | "PARSE_FAILED"
  | "SCHEMA_INVALID"
  | "WRITE_BLOCKED"
  | "ATOMIC_WRITE_FAILED"
  | "JSONC_NOT_SUPPORTED";

export interface ConfigError {
  code: ConfigErrorCode;
  message: string;
  file?: string;
  cause?: unknown;
}

export type Result<T, E = ConfigError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = ConfigError>(error: E): Result<never, E> {
  return { ok: false, error };
}
