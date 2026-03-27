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
INSTALL_DIR="${HOME}/.local/bin"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"

# Always exit 0 — hooks must never block prompts
trap 'exit 0' ERR

# No project dir = nothing to check
[ -z "$PROJECT_DIR" ] && exit 0

# Lazy init: bootstrap config dir and CLI symlink on first run
if [ ! -d "$CONFIG_DIR" ]; then
    mkdir -p "${CONFIG_DIR}/msgs"
    echo '{}' > "$MESSAGES_FILE"
    echo '{}' > "${CONFIG_DIR}/registry.json"
fi

# Symlink CLI to PATH if not already available
if ! command -v txlit > /dev/null 2>&1; then
    # Resolve script dir: hook lives at <root>/hooks/hook.sh, scripts at <root>/scripts/
    HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
    SCRIPT_SOURCE="${HOOK_DIR}/../scripts/txlit"
    # Follow one level of symlink on the hook itself (plugin cache may symlink hooks/)
    if [ ! -f "$SCRIPT_SOURCE" ] && [ -L "$0" ]; then
        HOOK_DIR="$(cd "$(dirname "$(readlink "$0")")" && pwd)"
        SCRIPT_SOURCE="${HOOK_DIR}/../scripts/txlit"
    fi
    if [ -f "$SCRIPT_SOURCE" ]; then
        SCRIPT_SOURCE="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)/txlit"
        mkdir -p "$INSTALL_DIR"
        ln -sf "$SCRIPT_SOURCE" "${INSTALL_DIR}/txlit"
    fi
fi

# Auto-register current project by basename if not already known
REGISTRY_FILE="${CONFIG_DIR}/registry.json"
if [ -f "$REGISTRY_FILE" ]; then
    already="$(jq -r --arg p "$PROJECT_DIR" \
      'to_entries[] | select((.value | if type == "object" then .path else . end) == $p) | .key' \
      "$REGISTRY_FILE" 2>/dev/null | head -1)"
    if [ -z "$already" ]; then
        proj_name="$(basename "$PROJECT_DIR")"
        # Avoid collisions: if name taken by a different path, suffix with hash
        existing="$(jq -r --arg n "$proj_name" '.[$n] | if type == "object" then .path else . end // empty' "$REGISTRY_FILE" 2>/dev/null)"
        if [ -n "$existing" ] && [ "$existing" != "$PROJECT_DIR" ]; then
            proj_name="${proj_name}-$(echo "$PROJECT_DIR" | shasum | cut -c1-4)"
        fi
        jq --arg name "$proj_name" --arg path "$PROJECT_DIR" \
          '.[$name] = {"path":$path}' "$REGISTRY_FILE" > "${REGISTRY_FILE}.tmp" && mv "${REGISTRY_FILE}.tmp" "$REGISTRY_FILE"
    fi
fi

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
