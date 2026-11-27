/**
 * Single source of truth for provider identity normalization in the catalog,
 * the UI and auth flows. The OpenCode CLI emits two different identifiers for
 * the same provider depending on the command invoked:
 *
 * - `opencode models --verbose` → `providerID: "opencode"`
 * - `opencode providers list`   → `OpenCode Zen` → `normalizeProviderName` → `"opencode"`
 *
 * `opencode` is the canonical technical id everywhere: catalog, config,
 * profiles and write-back. The auth signal is correlated to it only through
 * `normalizeProviderName` in `providerAuthService.ts`; the UI derives the
 * display label (e.g. "OpenCode Zen") from `resolveProviderLabel`, never by
 * changing the persisted id.
 */

/** Label base por catalog ID (sin auth activa). */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  "opencode":    "OpenCode",
  "opencode-go": "OpenCode Go",
};

/** Label cuando auth está activa para ese catalog ID. */
const AUTH_DISPLAY_NAMES: Record<string, string> = {
  "opencode": "OpenCode Zen",
};

/**
 * Devuelve el label visible para un proveedor.
 * isConnected = true  → label de suscripción activa (ej. "OpenCode Zen")
 * isConnected = false → label base (ej. "OpenCode")
 */
export function resolveProviderLabel(catalogId: string, isConnected: boolean): string {
  if (isConnected && AUTH_DISPLAY_NAMES[catalogId]) {
    return AUTH_DISPLAY_NAMES[catalogId];
  }
  return PROVIDER_DISPLAY_NAMES[catalogId] ?? catalogId;
}