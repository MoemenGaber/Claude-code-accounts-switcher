# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Instructions

### Commit Messages
- Do NOT add `Co-Authored-By: Claude` or any Claude/Anthropic co-author lines to commit messages in this repo.

## Overview

A CLI npm package (`claud-code-account-switcher`) that lets users manage up to 5 separate Claude Code accounts on one machine, each with isolated config dirs. Published to npm, installed globally with `npm install -g claud-code-account-switcher`.

## Commands

```sh
# Install dependencies
npm install

# Test locally (no test suite — manual testing only)
node bin/claude-switcher.js setup
node bin/claude-switcher.js add <name>
node bin/_cca.js list

# Publish to npm
npm publish
```

There is no build step, no linter config, and no test framework configured.

## Architecture

Two binaries expose the CLI:

- **`bin/claude-switcher.js`** — user-facing entrypoint. Defaults to `setup` if no subcommand. Delegates to `bin/_cca.js` via `spawnSync`.
- **`bin/_cca.js`** — internal dispatcher. Routes subcommands (`setup`, `add`, `use`, `who`, `list`, `--real-bin`, `--shell-block`) to lib modules. Unknown args fall through to `lib/run.js` (launches Claude).

Library modules in `lib/`:

| File | Purpose |
|---|---|
| `config.js` | Reads/writes the three state files in `$HOME`: `.claude-accounts.conf`, `.claude-active-account`, `.claude-real-bin`. Source of truth for account registry. |
| `os.js` | OS detection utility. `getOS()` returns `'windows' \| 'wsl' \| 'unix'`. WSL detected via `/proc/version` containing "microsoft". Single source of truth — no direct `process.platform` checks elsewhere. |
| `setup.js` | Interactive wizard using `@inquirer/prompts`. Detects existing `~/.claude-*` dirs, clones config (strips auth tokens), writes state files, patches shell profile. |
| `add.js` | Adds a single account non-interactively. |
| `switch.js` | Writes the active account to `.claude-active-account`. |
| `run.js` | Launches the real Claude binary with `CLAUDE_CONFIG_DIR` set to the active account's dir. |
| `shell.js` | Generates the shell function block injected into the user's profile. On Unix/WSL: bash/zsh syntax into `~/.zshrc` or `~/.bashrc`. On Windows: PowerShell syntax into the PS7+ or PS5.1 profile (detected at setup time via `pwsh` probe). |
| `detect.js` | Finds the real Claude binary on PATH. On Windows tries `claude.cmd`, `claude.exe`, `claude` and uses `where`; on Unix uses `which -a`. |

## Key Design Points

**Shell function, not a wrapper binary** — The `claude` command users type is a shell function injected into their profile by `lib/shell.js`. It intercepts account-name args, calls `_cca use --silent <name>` to switch, then `exec`s the real Claude binary with `CLAUDE_CONFIG_DIR` set. The env var is passed only to the subprocess — never exported.

**State stored in three dotfiles** — All runtime state lives in `~/.claude-accounts.conf` (name→dir map), `~/.claude-active-account` (current name), and `~/.claude-real-bin` (path to real claude binary). No database, no config format beyond `key=value`.

**`@inquirer/prompts`** is the only runtime dependency (interactive prompts in `setup.js`).

**Marker-based idempotency** — `lib/shell.js` uses `MARKER_START`/`MARKER_END` comment sentinels to detect and skip duplicate shell block injection.

**OS support** — Windows, WSL, macOS, and Linux are all supported. All OS branching goes through `lib/os.js:getOS()`. On Windows, `detectShellProfile()` probes for `pwsh` (PS7+) first, falls back to the PS5.1 `WindowsPowerShell` profile path. The PowerShell block uses `[regex]::Escape()` for account-name pattern matching and wraps the binary call in `try/finally` to guarantee `CLAUDE_CONFIG_DIR` cleanup.
