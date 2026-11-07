import type {
  AuthedUser,
  Category,
  Comment,
  HistoryEntry,
  NotificationItem,
  NewRequestPayload,
  Request,
  Role,
  Snapshot,
} from "./types";

export interface NotificationDraft {
  userId: string;
  requestId: string | null;
  kind: NotificationItem["kind"];
  title: string;
  body: string;
}

export interface RequestPatch {
  status?: Request["status"];
  assigneeId?: string | null;
  priority?: Request["priority"];
  decision?: string | null;
  rejectionReason?: string | null;
  dueDate?: string | null;
  title?: string;
  description?: string;
  categoryId?: string;
  possibleSolution?: string | null;
}

export interface Backend {
  readonly mode: "demo" | "supabase";
  getSession(): Promise<AuthedUser | null>;
  signIn(email: string, password: string): Promise<AuthedUser>;
  signOut(): Promise<void>;
  /** Snapshot filtered by the viewer's role (RLS enforced server-side in supabase mode). */
  loadSnapshot(userId: string, role: Role): Promise<Snapshot>;
  createRequest(userId: string, payload: NewRequestPayload): Promise<Request>;
  /** Appends a status_history entry automatically when patch.status changes the status. */
  updateRequest(
    userId: string,
    requestId: string,
    patch: RequestPatch,
    historyComment?: string | null,
  ): Promise<Request>;
  addComment(userId: string, requestId: string, text: string, kind: Comment["kind"]): Promise<Comment>;
  sendNotifications(items: NotificationDraft[]): Promise<void>;
  markNotificationsRead(userId: string, ids?: string[]): Promise<void>;
  updateProfile(userId: string, patch: Partial<Pick<AuthedUser, "name" | "position" | "department" | "color">>): Promise<AuthedUser>;
  changePassword(userId: string, nextPassword: string): Promise<void>;
  createUser(actorId: string, payload: { name: string; email: string; role: Role; position: string; department: string; password?: string }): Promise<AuthedUser>;
  updateUser(actorId: string, userId: string, patch: Partial<Pick<AuthedUser, "name" | "role" | "position" | "department">>): Promise<AuthedUser>;
  deleteUser(actorId: string, userId: string): Promise<void>;
  addCategory(actorId: string, name: string): Promise<Category>;
  updateCategory(actorId: string, categoryId: string, patch: Partial<Pick<Category, "name" | "active">>): Promise<Category>;
  resetDemo?(): Promise<void>;
}

export const TERMINAL_STATUSES: Request["status"][] = ["IMPLEMENTED", "REJECTED"];

/** Build a status history entry (used by demo backend; supabase uses a DB trigger/logic). */
export function buildHistory(
  requestId: string,
  from: Request["status"] | null,
  to: Request["status"],
  changedById: string,
  comment: string | null,
  existing: HistoryEntry[],
): HistoryEntry {
  return {
    id: `h_${requestId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    requestId,
    fromStatus: from,
    toStatus: to,
    changedById,
    comment,
    createdAt: new Date().toISOString(),
  };
}
