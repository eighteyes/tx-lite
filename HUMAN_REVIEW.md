# Human Review Steps

## txlit v1 - Inter-Agent Messaging (2026-02-13)

### Setup Verification
- [ ] Symlink txlit to PATH:
```bash
ln -sf ~/projects/ai-jank/tx-lite/bin/txlit ~/.local/bin/txlit
```
- [ ] Verify txlit is accessible:
```bash
which txlit
```
- [ ] Verify init was successful:
```bash
cat ~/.config/txlit/messages.json
```
- [ ] Verify hook is registered:
```bash
jq '.hooks.UserPromptSubmit' ~/.claude/settings.json
```
- [ ] Verify CLAUDE.md has txlit section:
```bash
grep "txlit" ~/.claude/CLAUDE.md
```

### Send/Receive Roundtrip
- [ ] Create a test handoff in any project:
```bash
mkdir -p ~/projects/some-project/.ai/handoffs
echo "# Test\nDo the thing." > ~/projects/some-project/.ai/handoffs/2026-02-13-test.md
```
- [ ] Send the message:
```bash
txlit send ~/projects/some-project 2026-02-13-test.md
```
- [ ] Verify it shows in list:
```bash
txlit list
```
- [ ] Open Claude in that project and verify the message appears in context on first prompt

### Multi-Message Queue
- [ ] Send 2+ messages to the same project
- [ ] Verify `txlit list` shows all
- [ ] Verify hook delivers all unread in one batch
- [ ] Verify second prompt does NOT re-deliver (all marked read)

### Clear Operations
- [ ] Clear a specific message by ID:
```bash
txlit clear ~/projects/some-project <id-from-list>
```
- [ ] Clear all messages for a project:
```bash
txlit clear ~/projects/some-project
```
- [ ] Verify `txlit list` reflects the clears

### Real Agent-to-Agent Test
- [ ] Open Claude in project A
- [ ] Have agent A write a handoff file to project B's .ai/handoffs/
- [ ] Have agent A run `txlit send <project-B-path> <handoff-file>`
- [ ] Open Claude in project B
- [ ] Verify agent B receives and can act on the instructions
