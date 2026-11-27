import type { OpenCodeConfig } from "@/types/opencode";

/**
 * Active profile strategy of the Gentle-AI profile contract.
 *
 * - `generated-multi`: native Gentle-AI contract — a base `gentle-orchestrator`
 *   plus at least one generated `sdd-orchestrator-{name}` profile. Writes are
 *   delegated to `gentle-ai sync` (handled by later units).
 * - `external-single-active`: profiles are managed by an external tool; PreSett
 *   is strictly read-only.
 * - `unknown`: no reliable signal; mutations are disabled.
 */
export type ProfileStrategy =
  | "generated-multi"
  | "external-single-active"
  | "unknown";

/** Base agent key that is immutable and never rewritten by profile operations. */
export const GENTLE_ORCHESTRATOR_KEY = "gentle-orchestrator";
/** Prefix for a generated named profile's orchestrator agent. */
export const SDD_ORCHESTRATOR_PREFIX = "sdd-orchestrator-";
/** Prefix shared by generated phase agents. */
export const SDD_PHASE_PREFIX = "sdd-";
/** The ten phase agents a generated profile materializes (`sdd-{phase}-{name}`). */
export const SDD_PHASES = [
  "init",
  "propose",
  "spec",
  "design",
  "tasks",
  "apply",
  "verify",
  "archive",
  "explore",
  "onboard",
] as const;

/** True when an agent key is a generated profile orchestrator (`sdd-orchestrator-{name}`). */
export function isOrchestratorProfileKey(key: string): boolean {
  return (
    key.startsWith(SDD_ORCHESTRATOR_PREFIX) &&
    key.length > SDD_ORCHESTRATOR_PREFIX.length
  );
}

/**
 * True when a profile name may not be created: the reserved literal `base`, the
 * bare internal marker `sdd-orchestrator`, or any name that starts with the
 * internal orchestrator prefix `sdd-orchestrator-`. The prefix is a technical
 * marker owned by gentle-ai; it must never be accepted as an input profile name
 * (which would leak `sdd-orchestrator-` into the visible name).
 */
export function isReservedProfileName(name: string): boolean {
  return (
    name === "base" ||
    name === SDD_ORCHESTRATOR_PREFIX.slice(0, -1) ||
    name.startsWith(SDD_ORCHESTRATOR_PREFIX)
  );
}

/** True when an agent key is a known generated phase agent (`sdd-{phase}-{name}`). */
export function isPhaseAgentKey(key: string): boolean {
  if (!key.startsWith(SDD_PHASE_PREFIX)) return false;
  const rest = key.slice(SDD_PHASE_PREFIX.length);
  const dashIndex = rest.indexOf("-");
  if (dashIndex <= 0) return false;
  const phase = rest.slice(0, dashIndex);
  return (SDD_PHASES as readonly string[]).includes(phase);
}

/**
 * Classify the active profile strategy from the authoritative local config.
 * Pure over `config` — no I/O, no CLI probing — so it stays cheap and re-runs
 * on every request without caching.
 *
 * Priority order:
 * 1. `external-single-active` — a primary-mode agent not managed by Gentle-AI
 *    signals profiles owned by an external tool (strictly read-only).
 * 2. `generated-multi` — the Base orchestrator or any generated profile asset
 *    is present. This includes a fresh, valid SDD install with only
 *    `gentle-orchestrator` and no named profiles yet, so the first profile can
 *    be created.
 * 3. `unknown` — no reliable signal (no Base orchestrator, no generated
 *    profile, no external primary).
 */
export function detectProfileStrategy(config: OpenCodeConfig): ProfileStrategy {
  // External single-active: a primary-mode agent that is neither the base
  // orchestrator nor a generated profile — an externally managed active profile.
  const hasExternalPrimary = Object.entries(config.agent).some(
    ([key, entry]) =>
      entry.mode === "primary" &&
      key !== GENTLE_ORCHESTRATOR_KEY &&
      !isOrchestratorProfileKey(key),
  );
  if (hasExternalPrimary) {
    return "external-single-active";
  }

  const hasBaseOrchestrator =
    config.agent[GENTLE_ORCHESTRATOR_KEY] !== undefined;
  const hasGeneratedProfile = Object.keys(config.agent).some(
    isOrchestratorProfileKey,
  );

  if (hasBaseOrchestrator || hasGeneratedProfile) {
    return "generated-multi";
  }

  return "unknown";
}

/**
 * Names of generated profiles (`sdd-orchestrator-{name}`) that are missing any
 * of their ten phase agents and are therefore repairable/incomplete.
 */
export function detectIncompleteProfiles(config: OpenCodeConfig): string[] {
  const incomplete: string[] = [];
  for (const key of Object.keys(config.agent)) {
    if (!isOrchestratorProfileKey(key)) continue;
    const name = key.slice(SDD_ORCHESTRATOR_PREFIX.length);
    const missingPhase = SDD_PHASES.some(
      (phase) => config.agent[`${SDD_PHASE_PREFIX}${phase}-${name}`] === undefined,
    );
    if (missingPhase) incomplete.push(name);
  }
  return incomplete;
}

export type ProfileMutationGuard =
  | { ok: true }
  | { ok: false; code: "STRATEGY_READONLY"; message: string };

/**
 * Route-level guardrail for profile mutations. Returns the read-only block for
 * `external-single-active` and `unknown` strategies (HTTP 403 STRATEGY_READONLY),
 * or `ok: true` for `generated-multi`.
 */
export function guardProfileMutation(
  strategy: ProfileStrategy,
): ProfileMutationGuard {
  if (strategy === "external-single-active") {
    return {
      ok: false,
      code: "STRATEGY_READONLY",
      message: "Profiles are managed externally; this strategy is read-only",
    };
  }
  if (strategy === "unknown") {
    return {
      ok: false,
      code: "STRATEGY_READONLY",
      message: "Profile strategy is unknown; profile mutations are disabled",
    };
  }
  return { ok: true };
}