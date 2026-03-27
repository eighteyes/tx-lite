# Human Review Steps

## Turn 0: SSH + GitHub Push (2026-02-23)

### Fix SSH Agent
- [ ] Load SSH key:
```bash
ssh-add ~/.ssh/id_ed25519
```
- [ ] Verify:
```bash
ssh -T git@github.com
```

### Push tx-lite
- [ ] Set remote back to SSH:
```bash
git -C ~/projects/tx-lite remote set-url origin git@github.com:eighteyes/tx-lite.git
```
- [ ] Push:
```bash
git -C ~/projects/tx-lite push -u origin main
```
- [ ] Verify repo: https://github.com/eighteyes/tx-lite

### Push know-cli
- [ ] Set remote back to SSH:
```bash
git -C ~/projects/know-cli remote set-url origin git@github.com:eighteyes/know-cli.git
```
- [ ] Push:
```bash
git -C ~/projects/know-cli push origin main
```
- [ ] Verify repo: https://github.com/eighteyes/know-cli

---

## Plugin Marketplace Install (2026-02-23, commit 4614336 / ef58561)

### txlit Plugin
- [ ] Add marketplace:
```
/plugin marketplace add eighteyes/tx-lite
```
- [ ] Install plugin:
```
/plugin install txlit@txlit
```
- [ ] Verify hook registered (should see txlit in UserPromptSubmit):
```bash
jq '.hooks.UserPromptSubmit' ~/.claude/settings.json
```
- [ ] Test: open Claude in any project, send a message to it, confirm delivery on next prompt

### know-tool Plugin
- [ ] Add marketplace:
```
/plugin marketplace add eighteyes/know-cli
```
- [ ] Install plugin:
```
/plugin install know-tool@know-cli
```
- [ ] Verify commands available:
```
/know:list
```
- [ ] Verify skill loaded (ask Claude about spec graphs, should reference know-tool)

---

## txlit v1 - Inter-Agent Messaging (2026-02-13)

### Setup Verification
- [ ] Symlink txlit to PATH:
```bash
ln -sf ~/projects/tx-lite/bin/txlit ~/.local/bin/txlit
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
- [ ] Compose a test message to any registered project:
```bash
txlit compose some-project 2026-02-13-test.md <<< "# Test\nDo the thing."
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
- [ ] Have agent A compose a message to project B: `txlit compose <project-B-name> <handoff-file> <<'EOF' ... EOF`
- [ ] Open Claude in project B
- [ ] Verify agent B receives and can act on the instructions
