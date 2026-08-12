# Spec: PreSett Fase 1 MVP (delta spec)

Derived from proposal `openspec/changes/fase-1-mvp/proposal.md` and exploration findings (#41).

## Capability 1: OpenCode config access (read)

**Requirement**: The system SHALL read `~/.config/opencode/opencode.json`, `~/.gentle-ai/state.json`, and `~/.gentle-ai/cache/model-variants.json` as structured data WITHOUT modifying them.

- Scenario: All files present — WHEN the dashboard or models page loads — THEN the system parses all three files and renders their data.
- Scenario: `opencode.json` malformed — WHEN any page loads — THEN the system shows a structured error identifying the file and parse problem, and performs no writes.
- Scenario: `state.json` missing — WHEN the dashboard loads — THEN the dashboard degrades with an explicit "state.json not found" indicator; other data still renders.
- Scenario: `model-variants` cache missing or unreadable — WHEN the models page loads — THEN the page shows a "validation unavailable" warning and save is blocked (see Capability 3).
- Scenario: `opencode.json` contains unknown fields — WHEN the system later writes the file — THEN all unknown fields are preserved in structure (never dropped).

## Capability 2: Dashboard state

**Requirement**: The dashboard SHALL show Gentle-AI installation state, OpenCode config status, backup count, and last sync info.

- Scenario: Healthy install — WHEN the dashboard loads — THEN status cards show gentle-ai presence, OpenCode configured state, backup count, last sync.
- Scenario: gentle-ai not installed — WHEN the dashboard loads — THEN a clear "Gentle-AI not installed" state renders with guidance; nothing crashes.

## Capability 3: Model assignment management

**Requirement**: The system SHALL display and modify `model` + `variant` assignments for `gentle-orchestrator`, all SDD phase agents, and all Judgment Day agents in `opencode.json`, with validation before any write.

- Scenario: View assignments — WHEN the models page loads — THEN every agent entry with a model assignment is listed with current provider/model/variant.
- Scenario: Pick model — WHEN the user selects an agent — THEN available models are listed by provider with variant levels sourced from the `model-variants` cache.
- Scenario: Valid save — WHEN the user changes model+variant and saves with valid selections — THEN the system validates, creates a pre-write backup (Capability 7), writes `opencode.json` atomically, and confirms success.
- Scenario: Invalid selection — WHEN the user selects a model or variant not present in the cache — THEN validation fails inline, and no write occurs.
- Scenario: Validation unavailable — WHEN the `model-variants` cache is missing/stale — THEN save is blocked with a clear message explaining why.

## Capability 4: SDD profile management

**Requirement**: The system SHALL create, edit, switch, and delete SDD profiles in `opencode.json` following gentle-ai naming conventions (`sdd-orchestrator-{name}` and `sdd-{phase}-{name}` agent entries).

- Scenario: List profiles — WHEN the profiles page loads — THEN the base profile and all named profiles are listed with active state and model count.
- Scenario: Create profile — WHEN the user creates a profile with a valid unique slug and model assignments — THEN the corresponding agent entries are added to `opencode.json` (validated + backed up per Capability 7).
- Scenario: Invalid or duplicate slug — WHEN the user enters an invalid or existing slug — THEN inline validation rejects it; no write occurs.
- Scenario: Switch profile — WHEN the user activates a profile — THEN `opencode.json` `default_agent` is set to the profile's orchestrator agent and the `.gentle-ai-default-agent.json` marker is left untouched (PreSett does not manage gentle-ai internals).
- Scenario: Delete profile — WHEN the user deletes a named profile — THEN its agent entries are removed from `opencode.json` (backed up first).
- Scenario: Delete default — WHEN the user attempts to delete the default/base profile — THEN the system rejects the action with a clear message.

## Capability 5: Backup viewer (read-only, decision D1)

**Requirement**: The system SHALL list backups in `~/.gentle-ai/backups/` with derived manifest metadata and SHALL NOT offer restore, pin, delete, or any mutating action.

- Scenario: Backups exist — WHEN the backups page loads — THEN each backup shows id, source (root_dir), timestamp, derived `file_count` (length of `entries`), derived `size` (bytes of `snapshot.tar.gz`), and a `pinned` flag computed as `true` when the backup directory name contains `upgrade-`.
- Scenario: No backups directory — WHEN the backups page loads — THEN an empty state renders.
- Scenario: Mutating action — at no point — THEN the UI offers restore/pin/delete; these remain in gentle-ai.

## Capability 6: Sync (thin wrapper, decision D2)

**Requirement**: The system SHALL execute `gentle-ai sync` as an external process and surface its result, without reimplementing sync logic.

- Scenario: Sync success — WHEN the user triggers sync and the command exits 0 — THEN output and success status render.
- Scenario: Sync failure — WHEN the command exits non-zero — THEN stderr/stdout and exit status render; no automatic retry.
- Scenario: gentle-ai missing — WHEN sync is triggered without gentle-ai installed — THEN a clear error state renders.

## Capability 7: Write safety

**Requirement**: Every write to `opencode.json` SHALL be preceded by schema validation and a PreSett-owned backup copy, and SHALL be atomic. PreSett SHALL NOT write into `~/.gentle-ai/backups/` (gentle-ai's store is read-only for PreSett per D1).

- Scenario: Pre-write backup — WHEN any write path executes — THEN a timestamped copy of the current `opencode.json` is stored in PreSett's own backup location before the write.
- Scenario: Atomic write — WHEN the write executes — THEN content goes to a temp file in the target directory and is renamed into place; a mid-write failure leaves the original file intact.
- Scenario: Validation failure — WHEN schema or model validation fails — THEN no backup and no write occur; the user sees the validation error.
- Scenario: JSONC refusal — WHEN the target file contains comments or is named `.jsonc` — THEN the adapter refuses to write and surfaces an error.
