> **IMPORTANT: Claude Agent SDK becomes pay-per-token on June 15th, 2026. This project depends on the SDK — remind the user before any SDK-related work.**

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is txlit?

**txlit** (TX-Lite) is an inter-agent messaging system for Claude Code. It lets agents in different project directories communicate via a hook-based mailbox system — sending handoff messages that are automatically delivered when the receiving agent's session starts or a prompt is submitted.

## No Build System

This is a pure bash project. There is no build step, no npm, no compilation. Scripts run directly.

**Dependencies:** `jq`, `uuidgen`, `date`, `sed`, `grep` (standard macOS tools)

## Architecture

### Core Components

- **`scripts/txlit`** — Main CLI. All subcommands live here. Entry point for everything.
- **`hooks/hook.sh`** — Hook script that runs on `UserPromptSubmit`. Handles lazy init, auto-registration, and message delivery.

### Hook Bootstrap (lazy init)

On first `UserPromptSubmit` after plugin install, the hook automatically:
1. Creates `~/.config/txlit/` with `messages.json`, `registry.json`, and `msgs/`
2. Symlinks `scripts/txlit` to `~/.local/bin/txlit` (if `txlit` not already on PATH)
3. Auto-registers the current project by directory basename (with hash suffix on collision)

No manual setup needed — the plugin handles everything.

### Data Flow

1. **Sending**: `txlit compose/send` → writes handoff `.md` file to `~/.config/txlit/msgs/<namespace>/` → registers pointer in `~/.config/txlit/messages.json`
2. **Delivery**: Claude Code fires `UserPromptSubmit` hook → hook reads `messages.json` → outputs handoff content → marks message as read
3. **Registry**: `~/.config/txlit/registry.json` maps project name aliases to absolute paths (auto-populated by hook, customizable via `txlit register`)

### Global Config (written to user's home, not this repo)

```
~/.config/txlit/messages.json        # Message queue (project path → [{id, from, handoff, status}])
~/.config/txlit/registry.json        # Name → path aliases (auto-populated)
~/.config/txlit/msgs/<namespace>/    # Handoff files, namespaced by target
```

### Message Storage

Handoff files are stored centrally in `~/.config/txlit/msgs/<namespace>/` where namespace is the registered project name (or basename of the target path). This is sandbox-safe — no files are written to target project directories.

### JSON Writes

All registry/config writes use temp file + `mv` for atomicity (prevents corruption on concurrent access).

## CLI Command Groups

| Group | Commands |
|-------|----------|
| Management | (handled by plugin bootstrap) |
| Registry | `register`, `unregister`, `intent`, `who` |
| Messaging | `compose`, `send`, `inbox`, `list`, `clear` |
| Terminal | `term grab`, `term relay` |
| Help | `help`, `--agent-help` |

## Key Constraints

- **Bash 3.2+ compatible** (macOS default). Avoid bash 4+ features (`declare -A`, etc.).
- Hook output must never block or fail a prompt — wrap in guards, always exit 0.
- `CLAUDE_PROJECT_DIR` env var is available inside hook execution (set by Claude Code).
- The hook is registered via the plugin manifest in `.claude-plugin/plugin.json`.

## Knowledge Base

`.ai/know/` contains spec graphs, features, and architecture docs for AI agents working on this project.
