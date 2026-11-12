import type { Comment, HistoryEntry, Request } from "./types";
import { OPEN_STATUSES } from "./constants";

/**
 * Метрики по ТЗ (п. 2.7): доля рассмотренных обращений, время до первого ответа,
 * доля обращений с зафиксированным результатом, количество реализованных улучшений.
 * Все показатели вычисляются на клиенте из снапшота — без изменения схемы данных.
 */

const HOUR_MS = 3600000;

/** Часы до первого ответа ответственного: первый комментарий или смена статуса не автором. null — ответа ещё нет. */
export function firstResponseHours(
  request: Request,
  comments: Comment[],
  history: HistoryEntry[],
): number | null {
  const candidates: number[] = [];
  const created = new Date(request.createdAt).getTime();
  for (const c of comments) {
    if (c.requestId !== request.id) continue;
    if (request.authorId && c.authorId === request.authorId) continue;
    candidates.push((new Date(c.createdAt).getTime() - created) / HOUR_MS);
  }
  for (const h of history) {
    if (h.requestId !== request.id) continue;
    if (h.toStatus === "NEW") continue;
    if (request.authorId && h.changedById === request.authorId) continue;
    candidates.push((new Date(h.createdAt).getTime() - created) / HOUR_MS);
  }
  const valid = candidates.filter((x) => x >= 0);
  return valid.length > 0 ? Math.min(...valid) : null;
}

export interface TzMetrics {
  /** Среднее время до первого ответа, ч (null — ответов ещё нет). */
  avgFirstResponseHours: number | null;
  /** Сколько обращений получили первый ответ. */
  answeredCount: number;
  /** Доля рассмотренных (взятых в работу), %. */
  reviewedShare: number;
  /** Доля обращений с зафиксированным результатом (реализовано/отклонено), %. */
  decidedShare: number;
  /** Количество реализованных улучшений. */
  implementedCount: number;
  /** Обращений в реестре. */
  total: number;
}

export function computeTzMetrics(
  requests: Request[],
  comments: Comment[],
  history: HistoryEntry[],
): TzMetrics {
  const total = requests.length;
  const firstResponses = requests
    .map((r) => firstResponseHours(r, comments, history))
    .filter((x): x is number => x != null);
  const reviewed = requests.filter((r) => r.status !== "NEW").length;
  const decided = requests.filter((r) => r.resolvedAt).length;
  const implemented = requests.filter((r) => r.status === "IMPLEMENTED").length;
  return {
    avgFirstResponseHours:
      firstResponses.length > 0 ? firstResponses.reduce((a, b) => a + b, 0) / firstResponses.length : null,
    answeredCount: firstResponses.length,
    reviewedShare: total > 0 ? (reviewed / total) * 100 : 0,
    decidedShare: total > 0 ? (decided / total) * 100 : 0,
    implementedCount: implemented,
    total,
  };
}

export interface RepeatedProblem {
  categoryId: string;
  /** всего обращений темы за период */
  count: number;
  /** сколько из них остаются открытыми */
  open: number;
  ids: string[];
}

/**
 * Повторяющиеся проблемы (ТЗ: выявление повторяющихся проблем и направлений улучшения):
 * темы, по которым за последние N дней поступило ≥ minCount обращений одной категории.
 * Возвращает общее число и сколько из них остаются открытыми.
 */
export function findRepeatedProblems(
  requests: Request[],
  windowDays = 30,
  minCount = 2,
): RepeatedProblem[] {
  const cutoff = Date.now() - windowDays * 86400000;
  const byCategory = new Map<string, { ids: string[]; open: number }>();
  for (const r of requests) {
    if (new Date(r.createdAt).getTime() < cutoff) continue;
    const entry = byCategory.get(r.categoryId) ?? { ids: [], open: 0 };
    entry.ids.push(r.id);
    if (OPEN_STATUSES.includes(r.status)) entry.open += 1;
    byCategory.set(r.categoryId, entry);
  }
  return [...byCategory.entries()]
    .filter(([, v]) => v.ids.length >= minCount)
    .map(([categoryId, v]) => ({ categoryId, count: v.ids.length, open: v.open, ids: v.ids }))
    .sort((a, b) => b.open - a.open || b.count - a.count);
}
