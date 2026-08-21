# Project Agent Rules — presett

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
