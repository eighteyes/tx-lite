#!/usr/bin/env bash
# txlit hook - Deliver pending messages to Claude Code agents
# Runs as UserPromptSubmit hook; outputs handoff contents for unread messages
#
# Responsibilities:
# - Check global registry for messages targeting current project
# - Output unread handoff file contents with source metadata
# - Mark delivered messages as read (only those successfully printed)
# - Skip messages whose handoff file is missing (leave unread, warn)
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

# ---- minimal mkdir-based lock (no dependency on txlit CLI) ----
_HOOK_LOCK_DIR="${CONFIG_DIR}/.messages.lock"

_hook_lock_acquire() {
    local deadline=$(( $(date +%s) + 5 ))
    while ! mkdir "$_HOOK_LOCK_DIR" 2>/dev/null; do
        local now
        now="$(date +%s)"
        if [ "$now" -ge "$deadline" ]; then
            return 1
        fi
        local lock_mtime
        lock_mtime="$(stat -f '%m' "$_HOOK_LOCK_DIR" 2>/dev/null || echo 0)"
        if [ "$now" -ge $(( lock_mtime + 5 )) ]; then
            rmdir "$_HOOK_LOCK_DIR" 2>/dev/null || true
        fi
        sleep 0.1
    done
    return 0
}

_hook_lock_release() {
    rmdir "$_HOOK_LOCK_DIR" 2>/dev/null || true
}
# ---------------------------------------------------------------

# Acquire lock before reading; if we can't, skip delivery this prompt
# (messages remain unread and will be delivered next prompt).
if ! _hook_lock_acquire; then
    echo "txlit: warning: could not acquire lock — delivery deferred to next prompt" >&2
    exit 0
fi

# Read messages.json once and capture everything we need atomically
unread_data="$(jq -r --arg p "$PROJECT_DIR" \
  '.[$p] // [] | .[] | select(.status == "unread") | "\(.id)\t\(.from)\t\(.timestamp)\t\(.handoff)"' \
  "$MESSAGES_FILE" 2>/dev/null)" || { _hook_lock_release; exit 0; }

if [ -z "$unread_data" ]; then
    _hook_lock_release
    exit 0
fi

# Deliver each unread message; collect IDs of successfully delivered ones
delivered_ids=""

while IFS=$'\t' read -r msg_id from timestamp handoff; do
    [ -z "$msg_id" ] && continue
    if [ ! -f "$handoff" ]; then
        echo "txlit: warning: handoff file missing for message ${msg_id} — leaving unread: ${handoff}" >&2
        continue
    fi
    echo "--- txlit message from ${from} [${timestamp}] ---"
    cat "$handoff"
    echo "--- end txlit message ---"
    echo ""
    delivered_ids="${delivered_ids} ${msg_id} "
done <<EOF
$unread_data
EOF

# Mark exactly the delivered IDs as read (skip undelivered/missing ones)
if [ -n "$delivered_ids" ]; then
    jq --arg p "$PROJECT_DIR" --arg ids "$delivered_ids" \
      '.[$p] = ((.[$p] // []) | map(
         if .status == "unread" and (($ids | contains(" " + .id + " "))) then
           .status = "read"
         else . end
       ))' \
      "$MESSAGES_FILE" > "${MESSAGES_FILE}.tmp" 2>/dev/null \
    && mv "${MESSAGES_FILE}.tmp" "$MESSAGES_FILE"
fi

_hook_lock_release

exit 0
