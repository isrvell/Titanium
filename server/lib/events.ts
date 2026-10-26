// ─── In-process event bus powering the SSE stream ───
// Routes publish typed workspace events here; the /api/events SSE route
// forwards them to subscribed clients so open browsers refresh in <1s.

import { EventEmitter } from "node:events";

export type WorkspaceEvent = {
  workspaceId: string;
  /** Coarse entity type the client should refresh, e.g. "tasks" | "comments" | "projects" | "members". */
  type: string;
  /** Optional narrow scope — typically the task id that changed. */
  taskId?: string;
  at: number;
};

const bus = new EventEmitter();
bus.setMaxListeners(200);

const channelKey = (workspaceId: string) => `ws:${workspaceId}`;

export function publishEvent(event: Omit<WorkspaceEvent, "at">): void {
  bus.emit(channelKey(event.workspaceId), { ...event, at: Date.now() } satisfies WorkspaceEvent);
}

export function subscribeWorkspace(
  workspaceId: string,
  handler: (event: WorkspaceEvent) => void,
): () => void {
  const key = channelKey(workspaceId);
  bus.on(key, handler);
  return () => bus.off(key, handler);
}
