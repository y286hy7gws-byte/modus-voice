import type { AuthedUser, Request, Snapshot } from "./types";

export interface EnrichedRequest extends Request {
  categoryName: string;
  authorName: string;
  authorColor: string;
  authorMasked: boolean;
  assigneeName: string | null;
  assigneeColor: string | null;
  commentCount: number;
  attachmentCount: number;
  lastActivityAt: string;
}

/** Resolve display fields for a request with role-aware anonymity masking. */
export function makeEnricher(snapshot: Snapshot, viewer: AuthedUser | null) {
  const profiles = new Map(snapshot.profiles.map((p) => [p.id, p]));
  const categories = new Map(snapshot.categories.map((c) => [c.id, c]));
  const commentCounts = new Map<string, number>();
  const lastComments = new Map<string, string>();
  for (const c of snapshot.comments) {
    commentCounts.set(c.requestId, (commentCounts.get(c.requestId) ?? 0) + 1);
    const prev = lastComments.get(c.requestId);
    if (!prev || prev < c.createdAt) lastComments.set(c.requestId, c.createdAt);
  }
  const attachmentCounts = new Map<string, number>();
  for (const a of snapshot.attachments) {
    attachmentCounts.set(a.requestId, (attachmentCounts.get(a.requestId) ?? 0) + 1);
  }

  return (r: Request): EnrichedRequest => {
    const author = r.authorId ? profiles.get(r.authorId) : undefined;
    const assignee = r.assigneeId ? profiles.get(r.assigneeId) : undefined;
    const canSeeAuthor =
      viewer != null && (!r.isAnonymous || viewer.role === "ADMIN" || viewer.id === r.authorId);
    return {
      ...r,
      categoryName: categories.get(r.categoryId)?.name ?? "Без категории",
      authorName: canSeeAuthor && author ? author.name : "Анонимно",
      authorColor: canSeeAuthor && author ? author.color : "#8a90a0",
      authorMasked: !canSeeAuthor,
      assigneeName: assignee?.name ?? null,
      assigneeColor: assignee?.color ?? null,
      commentCount: commentCounts.get(r.id) ?? 0,
      attachmentCount: attachmentCounts.get(r.id) ?? 0,
      lastActivityAt: lastComments.get(r.id) && lastComments.get(r.id)! > r.updatedAt ? lastComments.get(r.id)! : r.updatedAt,
    };
  };
}

export function enrichOne(snapshot: Snapshot, viewer: AuthedUser | null, requestId: string): EnrichedRequest | undefined {
  const r = snapshot.requests.find((x) => x.id === requestId);
  return r ? makeEnricher(snapshot, viewer)(r) : undefined;
}

export function enrichAll(snapshot: Snapshot, viewer: AuthedUser | null): EnrichedRequest[] {
  const enrich = makeEnricher(snapshot, viewer);
  return snapshot.requests.map(enrich);
}
