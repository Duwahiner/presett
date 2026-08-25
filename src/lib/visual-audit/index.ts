/**
 * Visual Audit Mode — Server-only environment gate.
 *
 * This module MUST only be imported from server components or server-side code.
 * The flag is `true` only when `PRESETT_VISUAL_AUDIT=1` is set in the
 * server environment. It is NEVER present in the client bundle when unset.
 */
export const IS_VISUAL_AUDIT_MODE: boolean =
  process.env.PRESETT_VISUAL_AUDIT === "1";
