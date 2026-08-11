# Proposal: PreSett Fase 1 MVP — Gentle-AI config GUI

## Intent

Let users manage Gentle-AI/OpenCode configuration through a local web GUI instead of hand-editing JSON. Exploration (#41) verified real file structures; scope covers model assignments, SDD profiles, read-only backup viewer, and a thin sync wrapper. Slice 1 scaffold (src/, adapters, services, Dashboard) already exists.

## Scope

### In Scope
- Models page: view/edit model + effort for gentle-orchestrator, 10 SDD agents, 3 Judgment Day agents; validated against model-variants cache; safe atomic write.
- Profiles page: create/edit/switch/delete SDD profiles (sdd-orchestrator-{name}, sdd-{phase}-{name}); default profile protected.
- Backups page: read-only viewer of `~/.gentle-ai/backups/` with derived manifest metadata (source, timestamp, file_count, size, pinned).
- Sync: thin wrapper executing `gentle-ai sync` with output/status surfacing.
- Write safety: Zod validation, pre-write backup (PreSett-owned, `~/.presett/backups/`), atomic rename, unknown-field preservation.

### Out of Scope
- Backup restore/pin/delete; state.json writes (toggles, persona, SDD mode); Claude Code/Codex adapters; PM2/IIS; concurrent-edit protection; cross-agent sync.

## Capabilities

### New Capabilities
- `opencode-config-access`: read opencode.json, state.json, model-variants.json without mutation.
- `dashboard-state`: install status, config status, backup count, last sync.
- `model-assignment-management`: display/modify model+effort with validation before writes.
- `sdd-profile-management`: create/edit/switch/delete profiles per gentle-ai conventions.
- `backup-viewer`: read-only backup listing with manifest metadata (D1).
- `sync`: execute `gentle-ai sync` as external process (D2).
- `write-safety`: validated, backed-up, atomic writes (D5/D6).

### Modified Capabilities
None — `openspec/specs/` does not exist yet; first specs will be created from these capabilities.

## Approach

- Next.js 16 App Router; all API routes on Node.js runtime (fs access; no edge). `proxy.ts` enabled per config (intercepting middleware alternative).
- Thin API routes over `src/adapters/` + `src/services/` + Zod validators; lib modules extend the existing Slice 1 base.
- Vertical slices: S2 models+validation+write, S3 profiles, S4 backups+sync.
- JSON round-trip preserves unknown keys; fail-soft on unknown fields; refuse writes to jsonc files.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/validators.ts` | New | Zod schemas + model/effort validation |
| `src/lib/pre-write-backup.ts` | New | PreSett-owned backup copies + retention |
| `src/lib/backups.ts` | New | Read backup manifests, derive metadata |
| `src/lib/process.ts` | New | Spawn `gentle-ai sync` (120s timeout) |
| `src/app/api/*/route.ts` | New | status/models/config/profiles/backups/sync |
| `src/components/` | Modified | ModelPicker, ConfirmDialog, ErrorBanner, pages |
| `src/adapters/opencode.ts` | Modified | Extend write path (validate+backup+atomic) |
| `proxy.ts` | Modified | Keep enabled; loopback-only binding |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| opencode.json schema evolves | Med | Adapter pinned to observed schema; fail-soft |
| model-variants cache stale/missing | Med | WRITE_BLOCKED with clear UI (spec Cap.3) |
| Profile-switch mechanism unknown | Med | Validate `.gentle-ai-default-agent.json` in S3; follow observed behavior (design A1) |
| ~1700 lines > 400 budget | High | Chained/stacked PR delivery (ask-on-risk) |

## Rollback Plan

- Each write: pre-write backup in `~/.presett/backups/` → restore by copying back.
- Atomic rename leaves original intact on mid-write failure.
- `git revert` for code regression.

## Dependencies

- Gentle-AI CLI installed locally (`gentle-ai sync`); zod ^3.24 already in package.json.
- Real config files verified present: `~/.config/opencode/opencode.json`, `~/.gentle-ai/{state.json,backups,cache}`.

## Success Criteria

- [ ] User views current assignments and edits model+effort; save produces valid opencode.json + pre-write backup.
- [ ] Profile create/switch/delete works per conventions; default protected.
- [ ] Backups list shows derived metadata; no mutating action offered.
- [ ] Sync runs `gentle-ai sync` and surfaces stdout/stderr/exit.
- [ ] No flow corrupts existing config (validation + backup on every write path).
