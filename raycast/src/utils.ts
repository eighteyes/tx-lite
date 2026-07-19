// utils.ts
// Utility functions for message formatting and filename generation
// Responsibilities: Format messages with context, generate timestamped filenames

import { AppContext } from "./types.js";

export function generateFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}.md`;
}

export function formatMessage(text: string, context: AppContext): string {
  const contextBlock = buildContextBlock(context);

  return `${text}${contextBlock}`;
}

function buildContextBlock(context: AppContext): string {
  const lines: string[] = ["\n\n---", "**Context**"];

  lines.push(`- App: ${context.app}`);
  lines.push(`- Time: ${context.timestamp}`);

  if (context.context.cwd) {
    lines.push(`- CWD: ${context.context.cwd}`);
  }

  if (context.context.url) {
    lines.push(`- URL: ${context.context.url}`);
  }

  return lines.join("\n");
}
