// txlit.ts
// Wrapper for txlit CLI interactions
// Responsibilities:
//   - Locate txlit binary on PATH
//   - Parse recipient list from `txlit who` output
//   - Read send history from messages.json (no CLI equivalent available)
//   - Compose and send messages via `txlit send <target> -m <body>`

import { execSync } from "child_process";
import { accessSync, constants, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Recipient, SendHistory } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "txlit");
// NOTE: messages.json is read directly because the CLI provides no subcommand to
// query send history. If txlit adds a `txlit history` command, replace this read.
const MESSAGES_FILE = join(CONFIG_DIR, "messages.json");

// Raycast spawns processes with a minimal PATH (/usr/bin:/bin:...), so neither
// txlit nor its dependencies (jq from homebrew) resolve. Every shell-out must
// use this augmented PATH.
const AUGMENTED_PATH = [
  join(homedir(), ".local", "bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].join(":");

// Raycast's env can carry LC_ALL=UTF-8 (not a valid locale), making every bash
// invocation emit "setlocale: cannot change locale" on stderr — noise that ends
// up in error toasts. Pin a valid locale.
const EXEC_ENV = {
  ...process.env,
  PATH: AUGMENTED_PATH,
  LC_ALL: "en_US.UTF-8",
  LANG: "en_US.UTF-8",
};

export function getTxlitPath(): string {
  // Absolute candidates first (hook-installed symlink, common bin dirs)
  const candidates = [
    join(homedir(), ".local", "bin", "txlit"),
    "/opt/homebrew/bin/txlit",
    "/usr/local/bin/txlit",
  ];
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  // Last resort: ask a login shell, which sees the user's full PATH
  try {
    const result = execSync("/bin/zsh -l -c 'command -v txlit'", {
      encoding: "utf-8",
    }).trim();
    if (result) return result;
  } catch {
    // fall through
  }
  throw new Error("txlit not found. Ensure txlit is on PATH or symlinked at ~/.local/bin/txlit.");
}

/**
 * Parse recipients from `txlit who` output.
 * Output format (one block per recipient):
 *   <name>  →  <path>
 *     <optional intent line>
 */
export function getRecipients(): Recipient[] {
  const txlitPath = getTxlitPath();
  let output: string;
  try {
    output = execSync(`"${txlitPath}" who`, { encoding: "utf-8", shell: "/bin/sh", env: EXEC_ENV });
  } catch (error) {
    throw new Error(
      "Failed to run `txlit who`. Ensure txlit is initialized and projects are registered."
    );
  }

  const recipients: Recipient[] = [];
  const lines = output.split("\n");

  let currentName: string | null = null;
  let currentPath: string | null = null;

  for (const line of lines) {
    // Arrow line: "  name  →  /path/to/project"
    const arrowMatch = line.match(/^\s+(\S.*?)\s+→\s+(.+?)\s*$/);
    if (arrowMatch) {
      // Flush previous
      if (currentName && currentPath) {
        recipients.push({ name: currentName, path: currentPath });
      }
      currentName = arrowMatch[1].trim();
      currentPath = arrowMatch[2].trim();
      continue;
    }

    // Intent line: "    <text>" (indented, no arrow)
    const intentMatch = line.match(/^\s{4,}(.+?)\s*$/);
    if (intentMatch && currentName && currentPath) {
      // Update the last entry with intent
      if (recipients.length > 0 && recipients[recipients.length - 1].name === currentName) {
        recipients[recipients.length - 1].intent = intentMatch[1].trim();
      } else {
        // Haven't pushed yet, push with intent
        recipients.push({ name: currentName, path: currentPath, intent: intentMatch[1].trim() });
        currentName = null;
        currentPath = null;
      }
    }
  }

  // Flush last entry
  if (currentName && currentPath) {
    recipients.push({ name: currentName, path: currentPath });
  }

  if (recipients.length === 0) {
    throw new Error("No registered projects. Run: txlit register <name> <path>");
  }

  return recipients;
}

export function getSendHistory(): SendHistory {
  try {
    const content = readFileSync(MESSAGES_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function getFrecentSortedRecipients(): Recipient[] {
  const recipients = getRecipients();
  const history = getSendHistory();

  // Score by frequency + recency
  const scores = new Map<string, number>();

  recipients.forEach((r) => {
    const messages = history[r.path] || [];
    const count = messages.length;

    const timestamps = messages.map((m) => new Date(m.timestamp).getTime());
    const mostRecent = Math.max(...timestamps, 0);
    const recencyScore = mostRecent > 0 ? (Date.now() - mostRecent) / 1000 : 999999;

    // Frecency: frequency weighted by inverse recency (3600s denominator)
    const score = count > 0 ? count / (1 + recencyScore / 3600) : 0;
    scores.set(r.path, score);
  });

  return recipients.sort((a, b) => (scores.get(b.path) || 0) - (scores.get(a.path) || 0));
}

/**
 * Send a message to a registered recipient via the txlit CLI.
 * Uses: txlit send <target> -m <body>
 * The target is the registered name (from `txlit who`), which the CLI resolves to a path.
 */
export function sendMessage(
  recipientName: string,
  text: string
): { success: boolean; error?: string } {
  try {
    const txlitPath = getTxlitPath();

    // Use -m with stdin to avoid shell quoting issues with arbitrary text
    execSync(`"${txlitPath}" send "${recipientName}" -m -`, {
      input: text,
      stdio: ["pipe", "pipe", "pipe"],
      shell: "/bin/sh",
      env: EXEC_ENV,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
