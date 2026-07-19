# txlit Raycast Extension

Send messages to Claude Code agents via txlit from anywhere on your system.

## Features

- **Send to Recipient** — Pick from frecency-sorted list of registered projects via a native dialog.
- **Compose & Send** — Edit message in a Raycast form before sending. Pre-filled from clipboard/selection.

## Requirements

- macOS
- Raycast
- txlit initialized (hook installed via Claude Code plugin — no manual `txlit install` needed)
- Projects registered with `txlit register <name> <path> "<intent>"`

## Setup

1. Install the extension locally in Raycast (via `ray develop` or sideload).

2. Register your projects (in any terminal):
   ```
   txlit register myproject /path/to/project "short description of what it does"
   ```

## Usage

### Send to Recipient
Copy or select text, run "Send to Recipient". Pick from your registered projects (sorted by frecency). Sends immediately on selection.

### Compose & Send
Run "Compose & Send". A Raycast form opens pre-filled with your clipboard text. Edit the message, pick a recipient from the dropdown, and submit.

## How It Works

1. Reads selected text from clipboard (Raycast fills this from selection).
2. Detects context: CWD for terminals, URL for Safari/Chrome, app name otherwise.
3. Appends a context block to the message.
4. Sends via `txlit send <name> -m <body>`. The txlit hook delivers it on the recipient's next Claude Code prompt.
