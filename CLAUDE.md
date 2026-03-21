# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is txlit?

**txlit** (TX-Lite) is an inter-agent messaging system for Claude Code. It lets agents in different project directories communicate via a hook-based mailbox system — sending handoff messages that are automatically delivered when the receiving agent's session starts or a prompt is submitted.

## No Build System

This is a pure bash project. There is no build step, no npm, no compilation. Scripts run directly.

**Installation:**
```bash
./plugins/txlit/scripts/txlit install
# or symlink manually
ln -sf /path/to/tx-lite/bin/txlit ~/.local/bin/txlit
```

**Dependencies:** `jq`, `uuidgen`, `date`, `sed`, `grep` (standard macOS tools)

## Architecture

### Core Components

- **`bin/txlit`** — Main CLI (~769 lines of bash). All subcommands live here. Entry point for everything.
- **`lib/hook.sh`** — Hook script that runs on `UserPromptSubmit`. Reads unread messages from registry and outputs them into the prompt context.
- **`plugins/txlit/`** — Plugin marketplace package (mirrors `bin/` and `lib/` for distribution).

### Data Flow

1. **Sending**: `txlit compose/send` → writes handoff `.md` file to `~/.config/txlit/msgs/<namespace>/` → registers pointer in `~/.config/txlit/messages.json`
2. **Delivery**: Claude Code fires `UserPromptSubmit` hook → hook reads `messages.json` → outputs handoff content → marks message as read
3. **Registry**: `~/.config/txlit/registry.json` maps project name aliases to absolute paths

### Global Config (written to user's home, not this repo)

```
~/.config/txlit/messages.json        # Message queue (project path → [{id, from, handoff, status}])
~/.config/txlit/registry.json        # Name → path aliases
~/.config/txlit/hook.sh              # Installed hook (copy of lib/hook.sh)
~/.config/txlit/msgs/<namespace>/    # Handoff files, namespaced by target
```

### Message Storage

Handoff files are stored centrally in `~/.config/txlit/msgs/<namespace>/` where namespace is the registered project name (or basename of the target path). This is sandbox-safe — no files are written to target project directories.

### JSON Writes

All registry/config writes use temp file + `mv` for atomicity (prevents corruption on concurrent access).

## CLI Command Groups

| Group | Commands |
|-------|----------|
| Management | `init`, `install`, `uninstall` |
| Registry | `register`, `unregister`, `intent`, `who` |
| Messaging | `compose`, `send`, `inbox`, `list`, `clear` |
| Help | `help`, `--agent-help` |

## Key Constraints

- **Bash 3.2+ compatible** (macOS default). Avoid bash 4+ features (`declare -A`, etc.).
- Hook output must never block or fail a prompt — wrap in guards, always exit 0.
- `CLAUDE_PROJECT_DIR` env var is available inside hook execution (set by Claude Code).
- The hook is registered in Claude Code's `~/.claude/settings.json` under `.hooks.UserPromptSubmit`.

## Knowledge Base

`.ai/know/` contains spec graphs, features, and architecture docs for AI agents working on this project. The TypeScript file at `.ai/scripts/tx-context-hook.ts` is a context injection helper used by the TX system itself (not txlit's source).
