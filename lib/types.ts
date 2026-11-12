export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type RequestType = "IDEA" | "PROBLEM" | "SUGGESTION" | "PROCESS" | "OTHER" | "FEEDBACK";

export type RequestStatus =
  | "NEW"
  | "IN_REVIEW"
  | "NEEDS_INFO"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type NotificationKind =
  | "REGISTERED"
  | "ASSIGNED"
  | "STATUS_CHANGED"
  | "COMMENT"
  | "INFO_REQUESTED"
  | "DECISION"
  | "IMPLEMENTED"
  | "DEADLINE";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  position: string;
  department: string;
  color: string;
  createdAt: string;
  /** Demo-mode only. Never exposed on real backend. */
  password?: string;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  system?: boolean;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  categoryId: string;
  priority: Priority;
  status: RequestStatus;
  /** null only for anonymous submissions where even the author record is hidden */
  authorId: string | null;
  isAnonymous: boolean;
  assigneeId: string | null;
  possibleSolution: string | null;
  decision: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  dueDate: string | null;
}

export interface Comment {
  id: string;
  requestId: string;
  authorId: string;
  text: string;
  kind: "message" | "info_request" | "note";
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  requestId: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  changedById: string;
  comment: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  requestId: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  requestId: string;
  name: string;
  size: number;
  mime: string;
  dataUrl: string;
  createdAt: string;
}

export interface AuthedUser extends Omit<Profile, "password"> {}

/** Routing rule: which responsible is the default assignee for a category. */
export interface RoutingRule {
  categoryId: string;
  /** null = no auto-assignment, request goes to the manual assignment queue */
  assigneeId: string | null;
}

export interface Snapshot {
  profiles: Profile[]; // passwords stripped for the client
  categories: Category[];
  requests: Request[]; // visibility-filtered per role
  comments: Comment[];
  history: HistoryEntry[];
  notifications: NotificationItem[]; // own only
  attachments: Attachment[];
  routing: RoutingRule[]; // category → default responsible (admin-managed)
  publicStats: PublicStats;
  /** Company-wide status distribution, visible to every authenticated role (public stats). */
  publicStatusCounts?: Partial<Record<Request["status"], number>>;
}

export interface PublicStats {
  total: number;
  implemented: number;
  implementationRate: number;
  avgResolutionHours: number;
}

export interface NewRequestPayload {
  title: string;
  description: string;
  type: RequestType;
  categoryId: string;
  priority: Priority;
  possibleSolution: string | null;
  isAnonymous: boolean;
  attachments: Array<{ name: string; size: number; mime: string; dataUrl: string }>;
  dueDate: string | null;
}
