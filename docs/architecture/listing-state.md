# Listing State Management

## Overview

Entity listings (Models, Profiles, Backups) use client-side filter/sort derivation via `useMemo` in each Container component. Two shared molecules handle the UI: `ListingControls` (filter/sort bar) and `ListingEmptyState` (no-data / no-matches).

## Architecture

```
Container.tsx
  ├─ raw data:        useState<T[]>        ← API load (unchanged)
  ├─ control state:   useState<Controls>   ← search, filters, sortField, sortDir
  ├─ derived data:    useMemo              ← filter → sort → stable secondary sort
  └─ View.tsx
       ├─ <ListingControls />              ← control state + callbacks + resultCount
       ├─ derived rows/cards               ← if derived.length > 0
       └─ <ListingEmptyState />            ← variant="no-data"|"no-matches", entity, onClear
```

## State Lifecycle

- **Mount**: Control state initializes to entity-specific defaults (e.g., Backups defaults to date-desc).
- **During mount**: `useMemo` derives filtered/sorted results from raw data + control state.
- **On control change**: `handleControlsChange` merges partial updates into control state; `useMemo` recomputes.
- **On clear**: `handleControlsClear` resets control state to initial defaults.
- **On unmount**: React destroys `useState` — control state is automatically cleared. No cleanup effect needed.

**Key invariant**: Control state is mount-scoped. It is NOT persisted to URL, localStorage, or any service. Navigating away and returning always shows default controls.

## Empty States

| Condition | Variant | When |
|-----------|---------|------|
| Source array is empty | `no-data` | API returns zero items |
| Source has items but filters match none | `no-matches` | Active filters eliminate all items |

`ListingEmptyState` shows a "Clear" button only for `no-matches`, calling `onClear` to reset controls.

## File Map

| File | Role |
|------|------|
| `src/components/molecules/ListingControls/` | Shared filter/sort/clear control bar |
| `src/components/molecules/ListingEmptyState/` | Shared no-data / no-matches molecule |
| `src/components/organisms/ModelsClient/ModelsClient.tsx` | Container: `filterAndSortModels` + controls state |
| `src/components/organisms/ProfilesClient/ProfilesClient.tsx` | Container: `filterAndSortProfiles` + controls state |
| `src/components/organisms/BackupsClient/BackupsClient.tsx` | Container: `filterAndSortBackups` + controls state |
| `src/resources/types.ts` | i18n key registry (`listing_*` keys) |
| `src/resources/en.ts` | English strings |
| `src/resources/es.ts` | Spanish strings |

## i18n Contract

All new labels and empty-state copy use the `listing_*` key prefix. The `types.ts` file defines the `Resources` interface — TypeScript enforces that every key exists in both `en.ts` and `es.ts`.

## Testing

| Layer | What | Approach |
|-------|------|----------|
| Unit — pure functions | `filterAndSortModels`, `filterAndSortProfiles`, `filterAndSortBackups` | Direct calls with known inputs |
| Unit — view | Each view renders correct empty states, shows filtered results | RTL with controlled props |
| Integration — listing | State cleanup, empty states across clients, i11y, i18n completeness | RTL + dynamic import |
| Integration — notifications | Mutation feedback through Sonner | RTL with mocked services |
