# Claude Code Account Switcher

Switch between multiple [Claude Code](https://claude.ai/code) accounts on the same machine — all through the familiar `claude` command.

```sh
claude work       # switch to work account and launch Claude
claude personal   # switch to personal account and launch Claude
claude list       # see all accounts
claude who        # see which account is active
```

---

## How It Works

The package injects a `claude()` shell function into your `~/.zshrc` or `~/.bashrc`. When you type `claude`, the function:

1. Reads the active account from `~/.claude-active-account`
2. Sets `CLAUDE_CONFIG_DIR` to that account's directory
3. Launches the real Claude binary with that config

Each account is fully isolated — separate auth tokens, history, settings, and project data.

---

## Install

```sh
npm install -g claud-code-account-switcher
```

**Requirements:** Node.js 18+, Claude Code CLI, zsh or bash

---

## Setup

Run the one-time setup wizard:

```sh
claude-switcher setup
```

The wizard will:
- Find your Claude Code installation
- Auto-detect any existing `~/.claude-*` config directories
- Ask how many accounts to configure (up to 5)
- Optionally clone your current `~/.claude` settings into each new account — preferences, plugins, and commands are copied; **auth tokens are stripped** so each account authenticates independently
- Inject the `claude()` function into your shell profile

Apply the changes:

```sh
source ~/.zshrc   # or source ~/.bashrc
```

---

## Usage

### Launch Claude with an account

```sh
claude work          # switch to 'work' and launch
claude personal      # switch to 'personal' and launch
claudework           # shorthand alias (auto-generated)
claudepersonal       # shorthand alias (auto-generated)
claude               # launch with the currently active account
```

When you specify an account name, the switch is silent and immediate — no confirmation prompt. The active account is shown before Claude starts:

```
→ [work]
```

### Manage accounts

```sh
claude who           # show active account and config dir
claude /who          # same
claude list          # list all accounts (* marks active)
claude use work      # switch active account (shows confirmation prompt)
claude-switcher add staging   # add a new account
claude-switcher setup         # re-run the full setup wizard
```

### Dynamic aliases

Aliases like `claudework` and `claudepersonal` are generated automatically at shell startup by reading `~/.claude-accounts.conf`. Adding a new account via `claude-switcher add <name>` makes `claude<name>` available after the next `source ~/.zshrc` — no manual profile edits needed.

---

## File Reference

| File | Purpose |
|---|---|
| `~/.claude-accounts.conf` | Account registry (`name=dir` per line) |
| `~/.claude-active-account` | Name of the currently active account |
| `~/.claude-real-bin` | Path to the real Claude binary (stored at setup) |

---

## Example: Setting Up Two Accounts

```sh
$ claude-switcher setup

=== Claude Code Account Switcher — Setup ===

Claude found: /Users/alice/.local/bin/claude ✓

Detected existing config directories:
  ~/.claude-work      ->  /Users/alice/.claude-work
  ~/.claude-personal  ->  /Users/alice/.claude-personal
? Use these detected accounts? Yes

Active account set to: work
Shell integration added to /Users/alice/.zshrc

Setup complete!
Run: source ~/.zshrc
Then try: claude work
```

```sh
$ source ~/.zshrc
$ claude list
  * work             ->  /Users/alice/.claude-work
    personal         ->  /Users/alice/.claude-personal

$ claude personal
→ [personal]
# Claude launches with personal account config
```

---

## License

MIT
