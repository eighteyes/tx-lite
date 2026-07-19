// ComposeForm.tsx
// React component for the Compose & Send command (view mode)
// Responsibilities:
//   - Render a Raycast Form with a TextArea for message and Dropdown for recipient
//   - Load recipient list via txlit CLI on mount
//   - On submit, format and send via txlit CLI using recipient's registered name

import React from "react";
import { Form, ActionPanel, Action, showHUD, showToast, Toast, Clipboard } from "@raycast/api";
import { getFrecentSortedRecipients, sendMessage } from "../txlit.js";
import { getActiveAppContext } from "../context.js";
import { formatMessage } from "../utils.js";
import { Recipient } from "../types.js";

interface FormValues {
  messageText: string;
  recipientName: string;
}

export function ComposeForm(): React.ReactElement {
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [initialText, setInitialText] = React.useState<string>("");

  React.useEffect(() => {
    // Pre-fill with clipboard content (Raycast populates clipboard from selection)
    Clipboard.readText()
      .then((text) => setInitialText(text ?? ""))
      .catch(() => setInitialText(""));

    try {
      const list = getFrecentSortedRecipients();
      setRecipients(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load recipients");
    }
  }, []);

  async function handleSubmit(values: FormValues) {
    const { messageText, recipientName } = values;

    if (!messageText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Message is empty" });
      return;
    }

    if (!recipientName) {
      await showToast({ style: Toast.Style.Failure, title: "No recipient selected" });
      return;
    }

    const context = getActiveAppContext();
    const formattedText = formatMessage(messageText, context);
    const result = sendMessage(recipientName, formattedText);

    if (result.success) {
      await showHUD(`Sent to ${recipientName}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Send failed",
        message: result.error,
      });
    }
  }

  if (loadError) {
    return (
      <Form actions={<ActionPanel />}>
        <Form.Description title="Error" text={loadError} />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="messageText"
        title="Message"
        placeholder="Enter your message..."
        defaultValue={initialText}
      />
      <Form.Dropdown id="recipientName" title="Recipient">
        {recipients.map((r) => (
          <Form.Dropdown.Item
            key={r.name}
            value={r.name}
            title={r.intent ? `${r.name} — ${r.intent}` : r.name}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
