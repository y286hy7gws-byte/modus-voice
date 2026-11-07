"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Paperclip, MessagesSquare, ArrowUpDown } from "lucide-react";
import type { AuthedUser } from "@/lib/types";
import type { EnrichedRequest } from "@/lib/selectors";
import { cn, formatDateShort, timeAgo } from "@/lib/utils";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/badges";
import { Avatar } from "@/components/ui/kit";

type SortKey = "id" | "title" | "status" | "priority" | "createdAt" | "updatedAt" | "category" | "author" | "assignee";

const COLUMNS: Array<{ key: SortKey; label: string; className?: string }> = [
  { key: "id", label: "ID", className: "w-[92px]" },
  { key: "title", label: "Обращение", className: "min-w-[280px]" },
  { key: "status", label: "Статус", className: "w-[170px]" },
  { key: "priority", label: "Приоритет", className: "w-[118px]" },
  { key: "category", label: "Категория", className: "w-[128px]" },
  { key: "author", label: "Автор", className: "w-[152px]" },
  { key: "assignee", label: "Ответственный", className: "w-[150px]" },
  { key: "createdAt", label: "Создано", className: "w-[104px]" },
  { key: "updatedAt", label: "Активность", className: "w-[104px]" },
];

export function RequestTable({
  requests,
  viewer,
  className,
}: {
  requests: EnrichedRequest[];
  viewer: AuthedUser;
  className?: string;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (r: EnrichedRequest): string | number => {
      switch (sortKey) {
        case "id":
          return r.id;
        case "title":
          return r.title.toLowerCase();
        case "status":
          return r.status;
        case "priority":
          return ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(r.priority);
        case "category":
          return r.categoryName;
        case "author":
          return r.authorMasked ? "я" : r.authorName.toLowerCase();
        case "assignee":
          return r.assigneeName?.toLowerCase() ?? "";
        case "createdAt":
          return r.createdAt;
        case "updatedAt":
          return r.lastActivityAt;
      }
    };
    return [...requests].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0));
  }, [requests, sortKey, sortDir]);

  const clickSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/60">
              {COLUMNS.map((c) => (
                <th key={c.key} className={cn("th", c.className)}>
                  <button
                    onClick={() => clickSort(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 uppercase tracking-[0.06em] transition-colors hover:text-ink-700",
                      sortKey === c.key && "text-brand-600",
                    )}
                  >
                    {c.label}
                    {sortKey === c.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp size={11} />
                      ) : (
                        <ArrowDown size={11} />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-25" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/requests/${r.id}`)}
                className="group cursor-pointer border-b border-ink-50 transition-colors last:border-0 hover:bg-brand-50/40"
              >
                <td className="num px-4 py-3 text-[12.5px] font-bold text-brand-600">{r.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[430px] truncate text-[13.5px] font-semibold text-ink-900 group-hover:text-brand-700">
                      {r.title}
                    </span>
                    {r.attachmentCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-ink-400" title="Вложения">
                        <Paperclip size={12} />
                        {r.attachmentCount}
                      </span>
                    )}
                    {r.commentCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-ink-400" title="Комментарии">
                        <MessagesSquare size={12} />
                        {r.commentCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <TypeBadge type={r.type} />
                    <span className="max-w-[260px] truncate text-[11.5px] text-ink-400">{r.description}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={r.priority} />
                </td>
                <td className="px-4 py-3 text-[12.5px] text-ink-600">{r.categoryName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.authorName} color={r.authorColor} size={26} />
                    <span className="max-w-[112px] truncate text-[12.5px] text-ink-700">
                      {r.authorMasked ? <em className="text-ink-400">{r.authorName}</em> : r.authorName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.assigneeName ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={r.assigneeName} color={r.assigneeColor ?? undefined} size={26} />
                      <span className="max-w-[108px] truncate text-[12.5px] text-ink-700">{r.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="rounded-md bg-warn-50 px-1.5 py-0.5 text-[11px] font-semibold text-warn-600">
                      Не назначен
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[12.5px] text-ink-600">{formatDateShort(r.createdAt)}</td>
                <td className="px-4 py-3 text-[12px] text-ink-400" title={r.lastActivityAt}>
                  {timeAgo(r.lastActivityAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
