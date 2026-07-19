// context.ts
// Active application context detection
// Responsibilities: Detect active app, capture CWD for terminals, URL for browsers

import { execSync } from "child_process";
import { AppContext } from "./types.js";

export function getActiveAppContext(): AppContext {
  const timestamp = new Date().toISOString();

  try {
    const app = getActiveApplication();
    const appContext = captureContextForApp(app);

    return {
      app,
      context: appContext,
      timestamp,
    };
  } catch {
    return {
      app: "unknown",
      context: {},
      timestamp,
    };
  }
}

function getActiveApplication(): string {
  try {
    const result = execSync(
      'osascript -e \'tell application "System Events" to name of first application process whose frontmost is true\'',
      { encoding: "utf-8" }
    ).trim();
    return result;
  } catch {
    return "unknown";
  }
}

function captureContextForApp(app: string): { cwd?: string; url?: string; appName?: string } {
  const normalizedApp = app.toLowerCase();

  if (normalizedApp.includes("terminal") || normalizedApp.includes("iterm")) {
    return { cwd: captureTerminalCwd(), appName: app };
  }

  if (normalizedApp.includes("safari")) {
    return { url: captureSafariUrl(), appName: app };
  }

  if (normalizedApp.includes("chrome") || normalizedApp.includes("chromium")) {
    return { url: captureChromeUrl(), appName: app };
  }

  return { appName: app };
}

function captureTerminalCwd(): string | undefined {
  try {
    // Get the frontmost Terminal window's process and extract CWD
    const script = `
      tell application "Terminal"
        set frontWindow to front window
        set frontTab to (selected tab of frontWindow)
        set tabProcess to processes of frontTab
        get custom title of frontTab
      end tell
    `;
    const result = execSync(`osascript -e '${script}'`, { encoding: "utf-8" }).trim();
    return result || undefined;
  } catch {
    // Fallback: try to get PWD from environment
    try {
      const pwd = execSync("pwd", { encoding: "utf-8" }).trim();
      return pwd || undefined;
    } catch {
      return undefined;
    }
  }
}

function captureSafariUrl(): string | undefined {
  try {
    const script = `
      tell application "Safari"
        get URL of current tab of window 1
      end tell
    `;
    const result = execSync(`osascript -e '${script}'`, { encoding: "utf-8" }).trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}

function captureChromeUrl(): string | undefined {
  try {
    const script = `
      tell application "Google Chrome"
        get URL of active tab of window 1
      end tell
    `;
    const result = execSync(`osascript -e '${script}'`, { encoding: "utf-8" }).trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}
