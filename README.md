# txlit

Inter-agent messaging system for Claude Code. Register projects by name, send handoff files between agents, auto-deliver messages on prompt submit.

## Install via Plugin Marketplace

```shell
/plugin marketplace add god/tx-lite
/plugin install txlit@txlit
```

This registers a `UserPromptSubmit` hook that delivers pending messages when an agent starts a turn.

### Add CLI to PATH

The plugin hook works inside Claude Code sessions automatically. To use `txlit` as a standalone terminal CLI:

```bash
# Option A: run the built-in installer
./plugins/txlit/scripts/txlit install

# Option B: symlink directly
ln -sf /path/to/tx-lite/bin/txlit ~/.local/bin/txlit
```

## Usage

```
txlit register <name> [path] [intent]   Name a project
txlit send <target|name> <handoff>      Send a message
txlit list [path|name]                  Show pending messages
txlit clear <path|name> [id]            Remove messages
txlit who                               List registered projects
```

## Workflow

1. Register projects: `txlit register backend ~/projects/backend "API server"`
2. Agent writes handoff file: `<target>/.ai/tx/msgs/YYYY-MM-DD-name.md`
3. Agent sends: `txlit send backend 2026-02-13-setup-auth.md`
4. Receiving agent gets the message on next prompt
5. Clear after processing: `txlit clear backend`

## Structure

```
tx-lite/
├── .claude-plugin/
│   └── marketplace.json       # Plugin marketplace catalog
├── plugins/
│   └── txlit/
│       ├── .claude-plugin/
│       │   └── plugin.json    # Plugin manifest (hooks config)
│       ├── hooks/hook.sh      # UserPromptSubmit delivery hook
│       └── scripts/txlit      # CLI script
├── bin/txlit                  # Original CLI (direct install)
└── lib/hook.sh                # Original hook source
```

## License

MIT
