"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Repeat,
  UserPlus,
  Info,
  CheckCircle2,
  XCircle,
  Rocket,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { NotificationItem, NotificationKind } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import { Button, Card, EmptyState } from "@/components/ui/kit";
import { cn, timeAgo } from "@/lib/utils";

const KIND_META: Record<NotificationKind, { icon: typeof Bell; cls: string; label: string }> = {
  REGISTERED: { icon: Inbox, cls: "bg-info-50 text-info-600", label: "Регистрация" },
  ASSIGNED: { icon: UserPlus, cls: "bg-brand-50 text-brand-600", label: "Назначение" },
  STATUS_CHANGED: { icon: Repeat, cls: "bg-ink-100 text-ink-600", label: "Статус" },
  COMMENT: { icon: MessageSquare, cls: "bg-info-50 text-info-600", label: "Комментарий" },
  INFO_REQUESTED: { icon: Info, cls: "bg-warn-50 text-warn-600", label: "Запрос информации" },
  DECISION: { icon: XCircle, cls: "bg-bad-50 text-bad-600", label: "Решение" },
  IMPLEMENTED: { icon: Rocket, cls: "bg-good-50 text-good-700", label: "Реализовано" },
};

export default function NotificationsPage() {
  const { user, snapshot, unreadCount, markRead } = useApp();
  const router = useRouter();

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-52" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  const all = snapshot.notifications;
  const unread = all.filter((n) => !n.read);
  const read = all.filter((n) => n.read);

  const openNotification = (id: string) => {
    void markRead([id]);
  };

  return (
    <div className="mx-auto max-w-[860px]">
      <PageHeader
        title="Уведомления"
        subtitle="Центр событий: изменения статусов, комментарии, назначения и решения по вашим обращениям."
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={() => void markRead()}>
              <CheckCheck size={15} />
              Отметить все прочитанными
            </Button>
          ) : undefined
        }
      />

      {all.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell size={26} />}
            title="Уведомлений пока нет"
            description="Здесь появятся события по вашим обращениям: регистрация, назначения, изменения статуса, комментарии и решения."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-ink-900">
                Новые
                <span className="num rounded-full bg-brand-600 px-2 py-0.5 text-[10.5px] font-bold text-white">
                  {unread.length}
                </span>
              </h2>
              <div className="space-y-2">
                {unread.map((n) => (
                  <NotificationRow key={n.id} name={user.name} notification={n} onClick={() => openNotification(n.id)} />
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-[13px] font-bold text-ink-400">Ранее</h2>
              <div className="space-y-2 opacity-80">
                {read.map((n) => (
                  <NotificationRow key={n.id} name={user.name} notification={n} muted />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  muted,
  onClick,
}: {
  name?: string;
  notification: NotificationItem;
  muted?: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();
  const meta = KIND_META[n.kind];

  const inner = (
    <div
      className={cn(
        "card flex items-start gap-3.5 px-4 py-3.5 transition-all duration-150 hover:shadow-pop",
        !muted && "border-l-[3px] border-l-brand-500 bg-brand-50/30",
        muted && "hover:border-ink-200",
      )}
    >
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.cls)}>
        <meta.icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[13.5px]", muted ? "font-semibold text-ink-700" : "font-bold text-ink-900")}>
            {n.title}
          </span>
          <span className="rounded-md bg-ink-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-ink-500">
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{n.body}</p>
        <span className="num mt-1 block text-[11.5px] text-ink-400">{timeAgo(n.createdAt)}</span>
      </div>
      {n.requestId && (
        <span className="mt-1 hidden shrink-0 items-center text-[12px] font-semibold text-brand-600 sm:flex">
          К обращению
          <ArrowRight size={13} className="ml-1" />
        </span>
      )}
    </div>
  );

  return n.requestId ? (
    <Link
      href={`/requests/${n.requestId}`}
      onClick={() => onClick?.()}
      className="block"
    >
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
  );
}
