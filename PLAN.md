# claud-code-account-switcher — Implementation Plan

> Reference document for the design decisions and architecture behind this package.
> Come back here if you need to understand why something was built the way it was.

---

## Context

Build a publishable npm package for managing multiple Claude Code accounts. Everything is exposed through the `claude` command — users never see or type an internal binary name. The npm package ships an internal helper binary `_cca` that the injected `claude` shell function calls under the hood.

---

## Package Identity

| Field | Value |
|---|---|
| npm package name | `claud-code-account-switcher` |
| Internal binary | `_cca` (never typed by users) |
| Public management binary | `claude-switcher` |
| User-facing launcher | `claude` shell function (auto-injected into `~/.zshrc` / `~/.bashrc`) |

---

## User-Facing Commands

### Launching Claude (via `claude` shell function)

| Command | Behavior |
|---|---|
| `claude` | Launch with the currently active account |
| `claude <name>` | Silently switch to account and launch (e.g. `claude work`) |
| `claude<name>` | Dynamic alias — e.g. `claudework`, `claudepersonal` (auto-generated) |
| `claude who` / `claude /who` | Show active account name and config dir |
| `claude list` | List all accounts, mark active with `*` |
| `claude use <name>` | Switch active account (with confirmation prompt) |
| `claude add <name>` | Add a new account |

### Account Management (via `claude-switcher` binary)

| Command | Behavior |
|---|---|
| `claude-switcher setup` | Full interactive setup wizard |
| `claude-switcher add <name> [dir]` | Add a new account |
| `claude-switcher use <name>` | Switch active account (with confirmation) |
| `claude-switcher who` | Show active account |
| `claude-switcher list` | List all accounts |

> `claude-switcher` is the entry point for first-time users before the shell function exists.
> `claude-switcher` with no arguments defaults to running setup.

---

## File Structure

```
claud-code-account-switcher/
├── package.json
├── bin/
│   ├── _cca.js              # internal CLI (users never call this directly)
│   └── claude-switcher.js   # public management binary (wraps _cca)
├── lib/
│   ├── config.js            # read/write ~/.claude-accounts.conf, active account, real bin path
│   ├── detect.js            # auto-detect ~/.claude-* dirs + locate real claude binary
│   ├── setup.js             # interactive setup wizard
│   ├── add.js               # add a single account + ~/.claude clone flow
│   ├── switch.js            # account switching (silent flag for shell function use)
│   ├── shell.js             # shell detection + idempotent profile patching
│   └── run.js               # spawn real claude binary with CLAUDE_CONFIG_DIR
├── README.md
└── PLAN.md                  # ← you are here
```

---

## Config Files (written to user's home dir)

**`~/.claude-accounts.conf`** — account registry
```
work=/Users/alice/.claude-account-work
personal=/Users/alice/.claude-account-personal
```

**`~/.claude-active-account`** — single line, active account name
```
work
```

**`~/.claude-real-bin`** — path to the real Claude binary (stored at setup time)
```
/Users/alice/.local/bin/claude
```

---

## Shell Function Design

The `claude` shell function is injected into `~/.zshrc` or `~/.bashrc` during `claude-switcher setup`. It is idempotent — a `# >>> claud-code-account-switcher >>>` marker prevents duplicate injection.

### Dynamic alias generation

At shell startup, the function reads `~/.claude-accounts.conf` and creates aliases:
- Account named `work` → `alias claudework='claude work'`
- Account named `personal` → `alias claudepersonal='claude personal'`

This means `claude-switcher add staging` → `source ~/.zshrc` → `claudestaging` is immediately available. No manual profile edits ever needed.

### Avoiding recursion

The real Claude binary path is stored in `~/.claude-real-bin` during setup. The shell function reads it via `_cca --real-bin` instead of `command -v claude`, which would recurse into itself.

### Silent switching

When the user types `claude work`:
1. The function detects `work` is a known account name
2. Calls `_cca use --silent work` (no confirmation dialog — explicit account name is the confirmation)
3. Shifts the argument off and launches Claude

When the user types `claude use work` (via `claude-switcher use work`):
1. Confirmation prompt is shown
2. Switch happens on confirmation

---

## Setup Wizard Flow (`lib/setup.js`)

1. **Validate claude binary** — search PATH, skip npm shims. Store path in `~/.claude-real-bin`. Exit with clear message if not found.
2. **Re-run prompt** — if accounts already configured, ask before overwriting.
3. **Auto-detect** — scan `~` for `.claude-*` directories. Strip prefix for suggested name. Present as pre-filled options.
4. **Account prompts** (up to 5):
   - Name: alphanumeric + hyphens/underscores. Reserved words blocked: `setup add use who list`
   - Dir: pre-filled from detected dirs, default `~/.claude-<name>`
   - If dir is new and `~/.claude` exists → offer to clone (copies settings/plugins/skills, deletes `.claude.json`)
   - If dir already exists → use as-is
5. **Write config** atomically via `.tmp` → rename
6. **Choose active account** — select prompt if multiple accounts
7. **Patch shell profile** — detect zsh/bash, append block with idempotency marker

### What gets cloned vs. stripped when copying `~/.claude`

| Kept | Stripped |
|---|---|
| `settings.json` | `.claude.json` (auth tokens) |
| `settings.local.json` | |
| `commands/` | |
| `plugins/` | |
| `skills/` | |

Each account must authenticate independently after clone.

---

## Key Design Decisions

### Why `_cca` is internal
Naming the npm binary `claude` would shadow the real Claude binary on PATH. Instead, `_cca` handles all internal logic and the public `claude-switcher` binary wraps it. Users interact only through the injected `claude()` shell function and `claude-switcher`.

### Why `claude-switcher` exists separately
Users need a way to run setup before the `claude` shell function is injected. `claude-switcher setup` is that bootstrap entry point. It also serves as the canonical account management interface so `claude` stays focused on launching.

### Why `spawnSync` with `stdio: inherit`
Claude Code is an interactive TUI application. Using `spawnSync` with `stdio: 'inherit'` passes stdin/stdout/stderr directly to the child process, preserving keyboard input and terminal rendering. `exec` or piped stdio would break the interactive experience.

### Why atomic writes for config files
Account switching can happen from multiple terminal sessions. Writing to a `.tmp` file and renaming avoids partial reads if a switch and a read collide.

### Why `CLAUDE_CONFIG_DIR` is not exported
Using `env CLAUDE_CONFIG_DIR="$dir" "$_REAL" "$@"` passes the variable only to the Claude subprocess. Exporting it (`export CLAUDE_CONFIG_DIR`) would pollute the shell environment, making `CLAUDE_CONFIG_DIR` persist across commands in the same session and potentially confusing Claude invocations that bypass the wrapper.

---

## Enhancements Implemented

All of these were added beyond the original spec:

1. **Auto-detect existing `~/.claude-*` dirs** during setup — no manual path typing for existing users
2. **Skip confirmation on `claude <name>`** — explicit account name in the command is the confirmation
3. **First-run auto-setup** — typing `claude` with no accounts configured launches setup automatically
4. **`claude-switcher add`** — add accounts one at a time without re-running full setup
5. **`→ [account]` indicator** — shows which account is active before Claude launches
6. **Validate claude binary at setup** — immediate clear error if Claude isn't installed
7. **Dynamic aliases** — `claudework` etc. generated from config file, not hardcoded

---

## Verification Checklist

```sh
# After install and setup:
claude-switcher who                    # shows active account
claude-switcher list                   # lists all with * on active
claude-switcher use work               # switches with confirmation
claude work                            # silent switch + → [work] + launches
claudework                             # alias works
claude /who                            # shows active without launching
claude --version                       # passes args through to real binary
claude-switcher add staging            # adds account
source ~/.zshrc && claudestaging       # new alias available
tail -35 ~/.zshrc                      # confirm marker block present
cat ~/.claude-accounts.conf            # confirm registry
cat ~/.claude-active-account           # confirm active
cat ~/.claude-real-bin                 # confirm binary path stored
```
