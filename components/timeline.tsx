"use client";

import { CheckCircle2, ArrowRight, ClipboardList, Info } from "lucide-react";
import type { HistoryEntry, Request, RequestStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/kit";

const TIMELINE_ORDER: RequestStatus[] = ["NEW", "IN_REVIEW", "NEEDS_INFO", "APPROVED", "IN_PROGRESS", "IMPLEMENTED"];

/** Визуальная временная шкала статусов + полный журнал изменений. */
export function Timeline({
  request,
  history,
  nameOf,
}: {
  request: Request;
  history: HistoryEntry[];
  nameOf: (id: string) => string;
}) {
  const extended = request.status === "REJECTED" ? [...TIMELINE_ORDER, "REJECTED" as RequestStatus] : [...TIMELINE_ORDER, "REJECTED" as RequestStatus];
  // Position of the current status on the typical path
  const pathFor = (status: RequestStatus): number => {
    switch (status) {
      case "NEW":
        return 0;
      case "IN_REVIEW":
        return 1;
      case "NEEDS_INFO":
        return 1.5;
      case "APPROVED":
        return 2;
      case "IN_PROGRESS":
        return 3;
      case "REJECTED":
        return 2;
      case "IMPLEMENTED":
        return 4;
      default:
        return 0;
    }
  };
  void extended;
  const current = pathFor(request.status);
  const rejected = request.status === "REJECTED";

  const steps: Array<{ label: string; pos: number }> = [
    { label: "Зарегистрировано", pos: 0 },
    { label: "На рассмотрении", pos: 1 },
    { label: "Решение принято", pos: 2 },
    { label: "В работе", pos: 3 },
    { label: "Реализовано", pos: 4 },
  ];

  const sortedHistory = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div>
      {/* Primary path */}
      <div className="relative pb-8 pt-2">
        <div className="absolute left-0 right-0 top-[13px] h-[3px] rounded-full bg-ink-100" />
        <div
          className="absolute top-[13px] h-[3px] rounded-full transition-all duration-700"
          style={{
            left: 0,
            width: `${(Math.min(current, 4) / 4) * 100}%`,
            background: rejected ? "#ef4444" : "linear-gradient(90deg, #6366f1, #059669)",
          }}
        />
        <div className="relative flex justify-between">
          {steps.map((s) => {
            const done = current >= s.pos && !(rejected && s.pos >= 2);
            const active = current === s.pos;
            return (
              <div key={s.pos} className="flex w-10 flex-col items-center sm:w-auto">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 bg-surface transition-all duration-300",
                    done && !rejected
                      ? "border-good-500 bg-good-500 text-white"
                      : rejected && s.pos === 2
                        ? "border-bad-500 bg-bad-500 text-white"
                        : active
                          ? "border-brand-600 text-brand-600"
                          : "border-ink-200 text-ink-300",
                  )}
                >
                  {done && !rejected ? (
                    <CheckCircle2 size={15} strokeWidth={2.5} />
                  ) : rejected && s.pos === 2 ? (
                    <Info size={15} strokeWidth={2.5} />
                  ) : (
                    <ClipboardList size={14} />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 hidden text-center text-[11px] font-semibold sm:block",
                    active ? "text-ink-900" : "text-ink-400",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full log */}
      <div className="space-y-0">
        {[...sortedHistory].reverse().map((h, i, arr) => (
          <div key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < arr.length - 1 && <span className="absolute left-[11px] top-7 h-full w-px bg-ink-100" />}
            <span
              className={cn(
                "relative mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                h.toStatus === "IMPLEMENTED"
                  ? "bg-good-100 text-good-700"
                  : h.toStatus === "REJECTED"
                    ? "bg-bad-100 text-bad-600"
                    : h.toStatus === "NEW"
                      ? "bg-info-100 text-info-600"
                      : "bg-ink-100 text-ink-500",
              )}
            >
              <ArrowRight size={12} strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold text-ink-900">{nameOf(h.changedById)}</span>
                <span className="num text-[11.5px] text-ink-400">{formatDateTime(h.createdAt)}</span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink-600">
                {h.fromStatus ? (
                  <>
                    Статус изменён: <b>{label(h.fromStatus)}</b> → <b>{label(h.toStatus)}</b>
                  </>
                ) : (
                  <>Обращение зарегистрировано</>
                )}
              </div>
              {h.comment && (
                <div className="mt-1 rounded-lg bg-ink-50 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink-700">
                  {h.comment}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { STATUSES } from "@/lib/constants";
function label(s: RequestStatus): string {
  return STATUSES[s].label;
}
