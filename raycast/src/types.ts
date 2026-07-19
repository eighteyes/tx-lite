// types.ts
// Type definitions for txlit Raycast extension
// Responsibilities: Define message, recipient, context, and history types

export interface Recipient {
  name: string;
  path: string;
  intent?: string;
}

export interface AppContext {
  app: string;
  context: {
    cwd?: string;
    url?: string;
    appName?: string;
  };
  timestamp: string;
}

export interface Message {
  text: string;
  filename: string;
  recipient: Recipient;
  context: AppContext;
}

export interface SendHistory {
  [targetPath: string]: Array<{
    id: string;
    from: string;
    handoff: string;
    timestamp: string;
    status: string;
  }>;
}
