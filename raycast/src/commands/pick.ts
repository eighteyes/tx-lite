// pick.ts
// Send to Recipient command (manual selection)
// Responsibilities:
//   - Read selected text from clipboard
//   - Show frecency-sorted recipient list via osascript
//   - Send via txlit CLI using recipient's registered name

import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { getActiveAppContext } from "../context.js";
import { getFrecentSortedRecipients, sendMessage } from "../txlit.js";
import { formatMessage } from "../utils.js";

const execAsync = promisify(exec);

export async function sendToRecipient() {
  const text = await Clipboard.readText();
  if (!text || text.trim().length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No text selected or copied" });
    return;
  }

  const context = getActiveAppContext();

  let recipients;
  try {
    recipients = getFrecentSortedRecipients();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No registered projects",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }

  if (recipients.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No recipients available",
      message: "Run: txlit register <name> <path>",
    });
    return;
  }

  const nameList = recipients.map((r) => `"${r.name}"`).join(",");
  const selectCommand = `osascript <<'EOF'
tell application "System Events"
  set recipientChoice to choose from list {${nameList}} with title "Pick Recipient" with prompt "Send to:"
  if recipientChoice is not false then
    return item 1 of recipientChoice
  else
    return ""
  end if
end tell
EOF`;

  await showToast({ style: Toast.Style.Animated, title: "Pick recipient..." });

  let selectedName: string;
  try {
    const { stdout } = await execAsync(selectCommand);
    selectedName = stdout.trim();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Selection failed" });
    return;
  }

  if (!selectedName) {
    await showToast({ style: Toast.Style.Failure, title: "No recipient selected" });
    return;
  }

  const recipient = recipients.find((r) => r.name === selectedName);
  if (!recipient) {
    await showToast({ style: Toast.Style.Failure, title: "Recipient not found" });
    return;
  }

  const formattedText = formatMessage(text, context);
  const result = sendMessage(recipient.name, formattedText);

  if (result.success) {
    await showHUD(`Sent to ${recipient.name}`);
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Send failed",
      message: result.error,
    });
  }
}
