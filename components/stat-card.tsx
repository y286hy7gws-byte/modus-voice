"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "brand",
  trend,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "brand" | "good" | "warn" | "bad" | "info";
  trend?: { value: string; positive?: boolean };
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    good: "bg-good-50 text-good-600",
    warn: "bg-warn-50 text-warn-600",
    bad: "bg-bad-50 text-bad-600",
    info: "bg-info-50 text-info-600",
  };
  return (
    <div className="card group px-4 py-4 transition-all duration-200 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">{label}</div>
          <div className="num mt-1.5 text-[26px] font-extrabold leading-7 tracking-[-0.02em] text-ink-900">
            {value}
          </div>
          {sub && <div className="mt-1 truncate text-[12.5px] text-ink-500">{sub}</div>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accents[accent])}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-2.5">
          <span
            className={cn(
              "text-[12px] font-semibold",
              trend.positive === false ? "text-bad-600" : "text-good-600",
            )}
          >
            {trend.value}
          </span>
        </div>
      )}
      <div
        className={cn(
          "mt-3 h-[3px] w-0 rounded-full transition-all duration-500 group-hover:w-full",
          accent === "brand" && "bg-brand-500/70",
          accent === "good" && "bg-good-500/70",
          accent === "warn" && "bg-warn-500/70",
          accent === "bad" && "bg-bad-500/70",
          accent === "info" && "bg-info-500/70",
        )}
      />
    </div>
  );
}
