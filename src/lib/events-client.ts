// ─── Client for the server's SSE stream (GET /api/events) ───
// One shared EventSource per workspace, shared across components via a
// registry — pages subscribe and get typed callbacks; the connection is
// closed when the last listener unsubscribes.

import { API_URL } from "./api";

export type WorkspaceEvent = {
  workspaceId: string;
  type: string;
  taskId?: string;
  at: number;
};

type Listener = (event: WorkspaceEvent) => void;

let source: EventSource | null = null;
let activeWorkspace: string | null = null;
const listeners = new Set<Listener>();

function connect(workspaceId: string) {
  activeWorkspace = workspaceId;
  source = new EventSource(`${API_URL}/api/events?workspaceId=${workspaceId}`, {
    withCredentials: true,
  });
  source.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data) as WorkspaceEvent;
      listeners.forEach((l) => l(event));
    } catch {
      // malformed frame — ignore
    }
  };
}

/** Subscribe to live events for a workspace. Returns an unsubscribe function. */
export function subscribeWorkspaceEvents(
  workspaceId: string,
  listener: Listener,
): () => void {
  if (!workspaceId) return () => {};

  listeners.add(listener);
  if (activeWorkspace !== workspaceId) {
    source?.close();
    connect(workspaceId);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      source?.close();
      source = null;
      activeWorkspace = null;
    }
  };
}
