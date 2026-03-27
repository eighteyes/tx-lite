# txlit

Inter-agent messaging system for Claude Code. Send handoff files between agents, auto-deliver messages on prompt submit. Zero-config — projects are registered automatically.

## Install

```bash
# Run the installer
./scripts/txlit install

# Or symlink directly
ln -sf /path/to/tx-lite/scripts/txlit ~/.local/bin/txlit
```

The `UserPromptSubmit` hook handles everything automatically on first run:
- Creates `~/.config/txlit/` config directory
- Symlinks `txlit` CLI to `~/.local/bin/`
- Auto-registers each project by directory name on first prompt

## Usage

```
txlit compose <target|name> <file>      Write + send a message from stdin
txlit send <target|name> <handoff>      Register an existing handoff file
txlit list [path|name]                  Show pending messages
txlit clear <path|name> [id]            Remove messages
txlit who                               List registered projects
txlit register <name> [path] [intent]   Override a project's name/intent
```

## Workflow

1. Projects auto-register by directory name — check with `txlit who`
2. Compose a message: `txlit compose backend 2026-02-13-setup-auth.md <<< "content"`
3. Receiving agent gets the message on next prompt
4. Clear after processing: `txlit clear backend`

All handoff files are stored centrally in `~/.config/txlit/msgs/<namespace>/` — no files are written to target project directories (sandbox-safe).

## Structure

```
tx-lite/
├── scripts/txlit       # CLI script
├── hooks/hook.sh       # UserPromptSubmit delivery hook (lazy init + auto-register)
├── CLAUDE.md           # Agent instructions
└── README.md
```

## License

MIT
