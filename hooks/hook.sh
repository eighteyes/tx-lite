#!/usr/bin/env bash
# txlit hook - Deliver pending messages to Claude Code agents
# Runs as UserPromptSubmit hook; outputs handoff contents for unread messages
#
# Responsibilities:
# - Check global registry for messages targeting current project
# - Output unread handoff file contents with source metadata
# - Mark delivered messages as read
# - Exit 0 always (never block prompts)

set -uo pipefail

CONFIG_DIR="${HOME}/.config/txlit"
MESSAGES_FILE="${CONFIG_DIR}/messages.json"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"

# Always exit 0 — hooks must never block prompts
trap 'exit 0' ERR

# No project dir = nothing to check
[ -z "$PROJECT_DIR" ] && exit 0

# No messages file = nothing to deliver
[ -f "$MESSAGES_FILE" ] || exit 0

# Check for unread messages for this project
unread_count="$(jq --arg p "$PROJECT_DIR" \
  '[.[$p] // [] | .[] | select(.status == "unread")] | length' \
  "$MESSAGES_FILE" 2>/dev/null)" || exit 0

[ "$unread_count" = "0" ] && exit 0

# Deliver each unread message
jq -r --arg p "$PROJECT_DIR" \
  '.[$p] // [] | .[] | select(.status == "unread") | "\(.from)\t\(.timestamp)\t\(.handoff)"' \
  "$MESSAGES_FILE" 2>/dev/null | while IFS=$'\t' read -r from timestamp handoff; do
    echo "--- txlit message from ${from} [${timestamp}] ---"
    if [ -f "$handoff" ]; then
        cat "$handoff"
    else
        echo "[handoff file not found: ${handoff}]"
    fi
    echo "--- end txlit message ---"
    echo ""
done

# Mark all as read for this project (atomic write)
jq --arg p "$PROJECT_DIR" \
  'if .[$p] then .[$p] |= map(if .status == "unread" then .status = "read" else . end) else . end' \
  "$MESSAGES_FILE" > "${MESSAGES_FILE}.tmp" 2>/dev/null && mv "${MESSAGES_FILE}.tmp" "$MESSAGES_FILE"

exit 0
