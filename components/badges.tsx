"use client";

import { STATUSES, PRIORITIES, TYPES } from "@/lib/constants";
import type { Priority, RequestStatus, RequestType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, size = "md" }: { status: RequestStatus; size?: "sm" | "md" }) {
  const s = STATUSES[status];
  return (
    <span className={cn("badge", s.chip, size === "sm" && "px-1.5 py-0 text-[10.5px]")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const p = PRIORITIES[priority];
  return (
    <span className={cn("badge", p.chip)} title={`Приоритет: ${p.label}`}>
      {compact ? p.label[0] : p.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: RequestType }) {
  return <span className="badge border border-ink-200 bg-ink-50 text-ink-600">{TYPES[type].label}</span>;
}
