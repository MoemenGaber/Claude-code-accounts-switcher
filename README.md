<div align="center">

<img src="https://raw.githubusercontent.com/MoemenGaber/Claude-code-accounts-switcher/main/assets/logo.png" alt="Claude Switcher Logo" width="400" />

# Claude Account Switcher

**Switch between multiple Claude Code accounts — seamlessly.**

[![npm version](https://img.shields.io/npm/v/claud-code-account-switcher?color=blueviolet&style=flat-square)](https://www.npmjs.com/package/claud-code-account-switcher)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Shell: zsh/bash](https://img.shields.io/badge/shell-zsh%20%7C%20bash-orange?style=flat-square)](#)

</div>

---

## What is this?

**Claude Code Account Switcher** lets you manage up to **5 separate Claude Code accounts** on the same machine — each with its own auth, history, settings, and project data — all through the `claude` command you already know.

```sh
claude work        # → switch to work account and launch Claude
claude personal    # → switch to personal account and launch Claude
claude             # → launch with the currently active account
```

No config files to edit. No environment variables to juggle. Just type and go.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  You type: claude work                                       │
│                                                             │
│  1. Shell function intercepts the command                   │
│  2. Reads active account from ~/.claude-active-account      │
│  3. Sets CLAUDE_CONFIG_DIR to that account's directory      │
│  4. Launches the real Claude binary                         │
│                                                             │
│  Result: Claude opens fully isolated to your work account   │
└─────────────────────────────────────────────────────────────┘
```

Each account lives in its own directory. Switching is instant.

---

## Install

```sh
npm install -g claud-code-account-switcher
```

> **Requirements:** Node.js 18+, [Claude Code CLI](https://claude.ai/code), zsh or bash

---

## Quick Start

### Step 1 — Run setup

```sh
claude-switcher setup
```

The wizard handles everything:

```
=== Claude Code Account Switcher — Setup ===

Claude found: /Users/you/.local/bin/claude ✓

Detected existing config directories:
  ~/.claude-work      →  suggested name: work
  ~/.claude-personal  →  suggested name: personal
? Use these detected accounts? Yes

? Copy ~/.claude settings into each new account? Yes
  ✓ Cloned settings, plugins, commands (auth tokens removed)

? Which account should be active by default? work

Shell integration added to ~/.zshrc ✓

Done! Run: source ~/.zshrc
Then try: claude work
```

### Step 2 — Apply shell changes

```sh
source ~/.zshrc
```

### Step 3 — Start switching

```sh
claude work
# → [work]
# Claude launches with your work account

claude personal
# → [personal]
# Claude launches with your personal account
```

---

## Commands

### Launching Claude

| Command | Description |
|---|---|
| `claude` | Launch with the currently active account |
| `claude <name>` | Switch to `<name>` and launch (e.g. `claude work`) |
| `claude<name>` | Shorthand alias — e.g. `claudework`, `claudepersonal` |

### Account Management

| Command | Description |
|---|---|
| `claude who` / `claude /who` | Show the active account and its config dir |
| `claude list` | List all accounts — active one marked with `*` |
| `claude use <name>` | Switch the active account (shows confirmation) |
| `claude-switcher add <name>` | Add a new account without re-running setup |
| `claude-switcher setup` | Re-run the full setup wizard |

---

## Features

- **Auto-detection** — Setup scans your home directory and pre-fills any existing `~/.claude-*` directories as account suggestions
- **Config cloning** — Optionally copy your current `~/.claude` settings (plugins, commands, skills) into each new account. Auth tokens are always stripped — each account authenticates independently
- **Dynamic aliases** — `claudework`, `claudepersonal`, etc. are generated at shell startup from your accounts config. Add a new account and the alias is ready after `source ~/.zshrc` — no manual edits needed
- **Zero shell pollution** — `CLAUDE_CONFIG_DIR` is passed only to the Claude subprocess, never exported into your shell environment
- **Idempotent setup** — Running `claude-switcher setup` again detects the existing shell block and won't duplicate it
- **First-run auto-setup** — Type `claude` on a fresh install with no accounts configured and setup launches automatically

---

## Under the Hood

```
~/.claude-accounts.conf      # name=dir registry (one account per line)
~/.claude-active-account     # currently active account name
~/.claude-real-bin           # path to real claude binary (set at setup)
```

The shell function injected into your profile looks up the active account, sets `CLAUDE_CONFIG_DIR`, and execs the real binary — no wrappers, no subshells, no side effects.

---

## Example: Three Accounts

```sh
claude-switcher setup        # configure work + personal
claude-switcher add client   # add a third account later

source ~/.zshrc

claude list
#     work             ->  ~/.claude-work
#   * personal         ->  ~/.claude-personal
#     client           ->  ~/.claude-client

claudeclient                 # switch to client and launch
claude who                   # Active account: client
claude use work              # switch with confirmation prompt
```

---

## Troubleshooting

**`claude: real binary not found`**
Run `claude-switcher setup` — it will locate and store the Claude binary path.

**`No active account`**
Run `claude-switcher setup` or `claude use <name>` to set an active account.

**Aliases not available (`claudework` not found)**
Run `source ~/.zshrc` to reload the shell function and regenerate aliases.

**Wrong account is active**
Run `claude who` to check, then `claude use <name>` or just `claude <name>` to switch.

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built for developers who live in multiple Claude contexts.

</div>
