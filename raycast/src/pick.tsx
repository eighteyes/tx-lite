// pick.tsx
// Raycast entry point for "Send to Recipient" (no-view command)
// Responsibilities: Export default async function as required by Raycast no-view commands

import { sendToRecipient } from "./commands/pick.js";

export default async function Command() {
  await sendToRecipient();
}
