export type ConfigErrorCode =
  | "FILE_MISSING"
  | "PARSE_FAILED"
  | "SCHEMA_INVALID"
  | "WRITE_BLOCKED"
  | "ATOMIC_WRITE_FAILED"
  | "JSONC_NOT_SUPPORTED"
  | "RESTORE_FAILED"
  | "PINNED_CANNOT_DELETE"
  | "NOT_FOUND";

export interface ConfigError {
  code: ConfigErrorCode;
  message: string;
  file?: string;
  cause?: unknown;
}

export type Result<T, E = ConfigError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Structured codes for failures that occur while detecting authenticated
 * providers via the OpenCode CLI. Kept independent of `ConfigErrorCode` because
 * provider detection is a distinct runtime domain.
 */
export type ProviderAuthErrorCode =
  | "CLI_NOT_FOUND"
  | "CLI_TIMEOUT"
  | "CLI_ERROR"
  | "PARSE_ERROR";

/**
 * A sanitized provider-detection error. `message` is always a generic constant
 * derived from `code`; it never includes absolute credential paths, tokens or
 * other environment details from the server.
 */
export interface ProviderAuthError {
  code: ProviderAuthErrorCode;
  message: string;
}

/**
 * Additive observability field exposed by `GET /api/models`. Lets consumers
 * distinguish a real empty list (`ok: true`) from a detection failure
 * (`ok: false` with a typed `code`).
 */
export type ProviderAuthStatus =
  | { ok: true }
  | { ok: false; code: ProviderAuthErrorCode; message: string };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = ConfigError>(error: E): Result<never, E> {
  return { ok: false, error };
}
