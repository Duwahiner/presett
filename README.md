# PreSett

Local web GUI for managing Gentle-AI / OpenCode configuration without hand-editing JSON.

## What it does

- **Dashboard**: shows Gentle-AI install state, OpenCode config status, backup count, and last sync info.
- **Models**: view and edit `model` + `variant` assignments for `gentle-orchestrator`, SDD phase agents, and Judgment Day agents, validated against the `model-variants` cache.
- **Profiles**: create, edit, switch, and delete SDD profiles following gentle-ai naming conventions (`sdd-orchestrator-{name}`, `sdd-{phase}-{name}`). The base profile is protected.
- **Backups**: read-only viewer for `~/.gentle-ai/backups/` with derived metadata (`file_count`, `size`, `pinned`). No restore/pin/delete actions.
- **Sync**: thin wrapper around `gentle-ai sync` that surfaces stdout/stderr/exit code.

## What it does NOT do

- Install Gentle-AI, agents, components, or plugins.
- Modify `state.json` (toggles, persona, SDD mode).
- Write into `~/.gentle-ai/backups/`.
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

## Rollback

Every write to `opencode.json`:

1. Is validated against the Zod schema and the `model-variants` cache.
2. Creates a timestamped PreSett-owned backup in `~/.presett/backups/`.
3. Is written atomically via same-directory rename.

If a write corrupts the config, restore by copying the latest backup back to `~/.config/opencode/opencode.json`.

## Status

Fase 1 MVP — Slices 1-4 implemented.
