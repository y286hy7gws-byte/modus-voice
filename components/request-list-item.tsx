"use client";

import { useRouter } from "next/navigation";
import { Paperclip, MessagesSquare } from "lucide-react";
import type { EnrichedRequest } from "@/lib/selectors";
import { formatDateShort, timeAgo } from "@/lib/utils";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/badges";

/** Компактная карточка обращения — для дашборда и списка «Мои обращения». */
export function RequestListItem({ request }: { request: EnrichedRequest }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/requests/${request.id}`)}
      className="group flex w-full items-start gap-3.5 border-b border-ink-50 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-brand-50/40 sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-[12px] font-bold text-brand-600">{request.id}</span>
          <StatusBadge status={request.status} size="sm" />
          <PriorityBadge priority={request.priority} />
        </div>
        <div className="mt-1.5 truncate text-[14px] font-semibold text-ink-900 group-hover:text-brand-700">
          {request.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
          <TypeBadge type={request.type} />
          <span>{request.categoryName}</span>
          {request.assigneeName && (
            <>
              <span className="text-ink-300">·</span>
              <span>Ответственный: {request.assigneeName}</span>
            </>
          )}
          {request.commentCount > 0 && (
            <span className="flex items-center gap-1 text-ink-400">
              <MessagesSquare size={12} /> {request.commentCount}
            </span>
          )}
          {request.attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-ink-400">
              <Paperclip size={12} /> {request.attachmentCount}
            </span>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[12px] font-medium text-ink-500">{formatDateShort(request.createdAt)}</div>
        <div className="mt-0.5 text-[11px] text-ink-300" title={request.lastActivityAt}>
          {timeAgo(request.lastActivityAt)}
        </div>
      </div>
    </button>
  );
}
