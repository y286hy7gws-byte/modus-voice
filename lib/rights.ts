import type { Profile, Request } from "./types";

/** Which requests can a given profile see? */
export function canViewRequest(user: AuthedUser, req: Request): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (req.authorId === user.id) return true;
  if (user.role === "MANAGER" && req.assigneeId === user.id) return true;
  return false;
}

type AuthedUser = Omit<Profile, "password">;

/** Who can act on a request (statuses, decisions, etc.) */
export function canManageRequest(user: AuthedUser, req: Request): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "MANAGER" && req.assigneeId === user.id;
}

/** Anonymity rule: everyone except ADMIN sees «Анонимно»; author still recognizes own card. */
export function authorLabel(user: AuthedUser | null, req: Request, profiles: Profile[], id2name: (id: string) => string): string {
  if (req.isAnonymous && (!user || user.role !== "ADMIN")) return "Анонимно";
  if (!req.authorId) return "Анонимно";
  return id2name(req.authorId);
}

export function homePathFor(user: AuthedUser | null): string {
  if (!user) return "/";
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "MANAGER") return "/manager";
  return "/dashboard";
}
