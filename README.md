# PreSett

Local web GUI for managing Gentle-AI / OpenCode configuration without hand-editing JSON.

## What it does

- **Dashboard**: shows Gentle-AI install state, OpenCode config status, backup count, and last sync info.
- **Models**: view and edit `model` + `variant` assignments for `gentle-orchestrator`, SDD phase agents, and Judgment Day agents, validated against the `model-variants` cache.
- **Profiles**: create, edit, switch, and delete SDD profiles following gentle-ai naming conventions (`sdd-orchestrator-{name}`, `sdd-{phase}-{name}`). The base profile is protected.
- **Backups**: viewer for `~/.gentle-ai/backups/` with derived metadata (`file_count`, `size`, `pinned`) and confirmed restore, pin/unpin, and delete actions.
- **Sync**: thin wrapper around `gentle-ai sync` that surfaces stdout/stderr/exit code.

## What it does NOT do

- Install Gentle-AI, agents, components, or plugins.
- Modify `state.json` (toggles, persona, SDD mode).
- Modify Gentle-AI backups without explicit local UI intent and server-side validation.
- Run as a public service or provide authentication.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript strict
- Tailwind CSS v4
- Radix UI primitives
- Vitest + @testing-library/react

## Project structure

```
presett/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components (atomic design)
│   ├── adapters/         # OpenCode config read/write adapter
│   ├── services/         # File/cache readers and process runners
│   ├── lib/              # Shared domain logic (validators, backup, paths)
│   └── types/            # Public TypeScript types
├── openspec/changes/fase-1-mvp/  # SDD artifacts
└── README.md
```

## Prerequisites

- Node.js 22+
- Gentle-AI CLI installed (`gentle-ai --version`)
- OpenCode config present at `~/.config/opencode/opencode.json`

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run Vitest suite
npm run build    # production build
```

## Security

PreSett is designed to run on localhost only. API routes bind to the loopback interface via Next.js defaults. No authentication is implemented.

State-changing API routes require a valid loopback `Origin` header. Backup mutations also validate the backup id, require the target backup to exist beneath the configured backup root, and return safe errors without exposing filesystem paths or process details.

## Backup operations

The Backups page lists Gentle-AI backups from `~/.gentle-ai/backups/` and shows the backup id, source directory, timestamp, file count, size, and pinned state.

- **Restore**: opens a confirmation dialog first. Only after confirmation does the UI send `confirmed: true` to the restore endpoint. Existing files may be overwritten by the underlying restore operation.
- **Pin / Unpin**: toggles the backup's pinned marker and refreshes the list. Pin and unpin do not use the destructive confirmation flag.
- **Delete**: opens a confirmation dialog first. Only after confirmation does the UI send `confirmed: true` to the delete endpoint.

Pinned backups are protected server-side. Unpin a backup before deleting it intentionally.

## Rollback

Every write to `opencode.json`:

1. Is validated against the Zod schema and the `model-variants` cache.
2. Creates a timestamped PreSett-owned backup in `~/.presett/backups/`.
3. Is written atomically via same-directory rename.

If a write corrupts the config, restore by copying the latest backup back to `~/.config/opencode/opencode.json`.

## Status

Fase 1 MVP — Slices 1-4 implemented.
