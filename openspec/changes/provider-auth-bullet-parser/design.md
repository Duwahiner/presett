# Design: provider-auth-bullet-parser

## Technical Approach

Replace the hardcoded `startsWith("●")` guard in `parseConnectedProviders` with a character-class test that accepts both U+2022 (`•`) and U+25CF (`●`). Add one test block with a captured ANSI fixture that uses `•` and covers five known provider IDs. No public API or call-site changes required.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `[•●]` regex test via `/^[•●]/` | Declarative, easy to extend | **Chosen** |
| `startsWith("•") \|\| startsWith("●")` | More explicit, slightly verbose | Rejected — regex is less fragile under future bullet additions |
| Strip ANSI first then regex | Would require restructuring `stripAnsiCodes` flow | Rejected — flow already strips before the guard |

## Data Flow

```
CLI stdout (ANSI)
    │
    ▼
stripAnsiCodes(output)       ← no change
    │
    ▼
split lines → for each line
    │
    ▼
/^[•●]/.test(trimmed)        ← CHANGED: was startsWith("●") only
    │
    ▼
extract name + authType → ConnectedProvider[]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/providerAuthService.ts` | Modify | Replace `startsWith("●")` with `/^[•●]/.test(trimmed)` on line 112; adjust `substring(1)` to `replace(/^[•●]/, "").trim()` |
| `src/services/__tests__/providerAuthService.test.ts` | Modify | Add `describe` block: ANSI fixture with `•` bullets and five known providers |

## Interfaces / Contracts

No interface change. `parseConnectedProviders(output: string): ConnectedProvider[]` signature is unchanged.

**Key regex (surgical):**

```typescript
// Before
if (trimmed.startsWith("●")) {
  const content = trimmed.substring(1).trim();

// After
if (/^[•●]/.test(trimmed)) {
  const content = trimmed.replace(/^[•●]/, "").trim();
```

**ANSI fixture shape (RED test — fails before the fix):**

```typescript
const ANSI_U2022_OUTPUT = `\u001b[0m
\u001b[90m┌\u001b[39m  Credentials \u001b[90m~\\.local\\share\\opencode\\auth.json
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  OpenCode Go \u001b[90mapi
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  OpenAI \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  Google \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  Anthropic \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  X AI \u001b[90mapi
\u001b[90m│\u001b[39m
\u001b[90m└\u001b[39m  5 credentials
`;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit RED | `•` bullets in ANSI output → 5 providers | Add test; assert fails before fix |
| Unit GREEN | Same fixture → 5 providers after fix | Same test passes after regex change |
| Unit regression | `●` bullets (existing ANSI test) | Existing test on line 66 must still pass |
| Unit boundary | Header/footer lines ignored | Existing empty/no-provider tests cover this |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is changed. The parser is a pure string function.

## Migration / Rollout

No migration required. Single-commit change; rollback is reverting one regex line.

## Open Questions

- None. The fixture format is captured from current CLI output; the five IDs (`opencode-go`, `openai`, `google`, `anthropic`, `xai`) are confirmed by `normalizeProviderName` tests.
