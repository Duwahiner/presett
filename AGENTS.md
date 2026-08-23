# Project Agent Rules — presett

<!-- gentle-ai:orchestrator-config -->
## Orchestrator Response Language Configuration

**Status**: Configured for dynamic language selection based on PreSett workspace settings.

The SDD orchestrator for this project is configured to read its response language from `~/.gentle-ai/state.json`. When PreSett's "Idioma de Respuesta" setting changes, the orchestrator MUST respect that configuration and respond in the configured language, NOT the language of the user input.

### Current Configuration
- Language is stored in: `~/.gentle-ai/state.json` → `language` field
- PreSett UI setting: Espacio de Trabajo > Idioma de Respuesta
- Rule: The orchestrator MUST respond in the configured language, regardless of user input language

### For Developers
If the orchestrator is still responding in the wrong language:
1. Verify `~/.gentle-ai/state.json` contains the correct `language` field
2. Run `gentle-ai sync` to ensure orchestrator has latest configuration
3. Check AGENTS.md (this file) for any project-level overrides
4. Note: `gentle-ai sync` may reset opencode.json, so configuration is managed via state.json, not opencode.json

This ensures consistent, professional communication in development workflows and prevents context-switching between languages in a single session.
<!-- /gentle-ai:orchestrator-config -->

## Checkout and Worktree Policy

- By default, work sequentially in a single checkout.
- Use git worktrees only temporarily for genuinely independent tasks or with explicit authorization.
- After integrating a worktree's changes, remove the worktree only after verification confirms the tree is clean.
- When a worktree exists, never run `npm install` or `npm ci` inside it. Share the root checkout's dependencies through an OS-appropriate link named `node_modules` (a junction on Windows, or a symlink where supported).

## Node Modules in Git Worktrees (CRITICAL)

**Never run `npm install` or `npm ci` inside a git worktree of this project.**

Each worktree MUST share the root checkout's `node_modules` through a link — not a separate dependency installation.

### Why

Running a dependency installation per worktree duplicates a large dependency tree for every branch,
which wastes disk space and can make worktree cleanup error-prone.

### Required setup when creating a new worktree

After `git worktree add`, create the dependency link immediately — do NOT run `npm install` or `npm ci`.
Use paths derived from the repository root and worktree location; do not hard-code a developer-specific path.

```powershell
# Example for Windows PowerShell. Replace these with paths for the current checkout.
$worktree = "<worktree-path>"
$rootNM   = "<repository-root>\node_modules"
cmd /c "mklink /J `"$worktree\node_modules`" `"$rootNM`""
```

On other operating systems, create an equivalent symbolic link.

### Required setup when removing a worktree

Remove the junction BEFORE running `git worktree remove` to avoid Git errors:

```powershell
$worktree = "<worktree-path>"
# Remove junction only (do NOT use /s /q — that would delete root node_modules!)
cmd /c "rmdir `"$worktree\node_modules`""
git worktree remove $worktree
```

> `rmdir` without `/s` removes only the junction link, not the target directory contents.

### Verification

Check all worktrees have junctions (not real directories):

```powershell
$root = "<worktrees-root>"
Get-ChildItem $root -Directory | ForEach-Object {
    $nm = "$($_.FullName)\node_modules"
    $item = Get-Item $nm -ErrorAction SilentlyContinue
    $isJunction = $item -and ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
    [PSCustomObject]@{ Worktree = $_.Name; IsJunction = [bool]$isJunction }
} | Format-Table -AutoSize
```

## Package Manager

This project uses **npm** with `package-lock.json`. Do not switch package managers.

## SDD Verification Envelope

`gentle-ai sdd-verify-validate` parses only a **flat** fenced YAML envelope. Before persisting or validating a verification report, use scalar fields on one line:

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:<64-hex>
verdict: pass
blockers: 0
critical_findings: 0
requirements: 24/24
scenarios: 30/30
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:<64-hex>
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:<64-hex>
```

Do **not** use nested maps (`requirements: { completed, total }`) or list values (`blockers: - None`): the validator rejects them as malformed. Always run `gentle-ai sdd-verify-validate --input <report> --requirements <n> --scenarios <n>` before treating verification as complete.
