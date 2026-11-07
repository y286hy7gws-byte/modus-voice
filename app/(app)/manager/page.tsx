"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  ArrowRightLeft,
  Clock,
  Timer,
  Flame,
  Wrench,
  BadgeCheck,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { enrichAll } from "@/lib/selectors";
import { OPEN_STATUSES } from "@/lib/constants";
import { formatHours, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { RequireRole } from "@/components/route-guard";
import { Button, Card, EmptyState } from "@/components/ui/kit";

function ManagerPanelInner() {
  const { user, snapshot, changeStatus } = useApp();
  const router = useRouter();

  const assigned = useMemo(
    () => (user && snapshot ? enrichAll(snapshot, user).filter((r) => r.assigneeId === user.id) : []),
    [user, snapshot],
  );

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-28" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  const queue = assigned
    .filter((r) => r.status === "NEW" || r.status === "NEEDS_INFO")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const review = assigned.filter((r) => r.status === "IN_REVIEW");
  const work = assigned.filter((r) => r.status === "IN_PROGRESS" || r.status === "APPROVED");
  const closedOnes = assigned.filter((r) => r.status === "IMPLEMENTED" || r.status === "REJECTED");
  const resolved = assigned.filter((r) => r.resolvedAt);
  const avg = resolved.length
    ? resolved.reduce((a, r) => a + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / 3.6e6, 0) /
      resolved.length
    : 0;
  const overdue = assigned.filter(
    (r) => r.dueDate && new Date(r.dueDate).getTime() < Date.now() && OPEN_STATUSES.includes(r.status),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Панель ответственного"
        subtitle={`Обращения, назначенные вам. ${user.position} · ${user.department}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Inbox size={18} />} label="Назначено всего" value={assigned.length} sub={`Активных: ${assigned.length - closedOnes.length}`} accent="info" />
        <StatCard icon={<Flame size={18} />} label="Требуют реакции" value={queue.length} sub={queue.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH").length ? "Есть высокоприоритетные" : "Без критических"} accent="bad" />
        <StatCard icon={<Wrench size={18} />} label="В работе" value={work.length} sub={`На рассмотрении: ${review.length}`} accent="brand" />
        <StatCard icon={<Timer size={18} />} label="Средняя скорость" value={formatHours(avg)} sub={overdue.length ? `Просрочено: ${overdue.length}` : "Просрочек нет"} accent="good" />
      </div>

      {overdue.length > 0 && (
        <Card className="border-bad-100 bg-bad-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={18} className="text-bad-600" />
              <div>
                <div className="text-[13.5px] font-bold text-bad-700">
                  {overdue.length} обращени{overdue.length === 1 ? "е" : "й"} за пределами контрольного срока
                </div>
                <div className="text-[12px] text-bad-600/80">Отработайте приоритетно или запросите информацию у автора.</div>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={() => router.push("/requests")}>
              Открыть реестр
            </Button>
          </div>
        </Card>
      )}

      {/* Queue */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Очередь — требуется решение</h2>
          <span className="num rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-bold text-warn-600">{queue.length}</span>
        </div>
        {queue.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck size={26} />}
            title="Очередь пуста"
            description="Все назначенные обращения обработаны. Новые обращения появятся здесь и в уведомлениях."
          />
        ) : (
          <div>
            {queue.map((r) => (
              <div
                key={r.id}
                className="group flex flex-col gap-3 border-b border-ink-50 px-5 py-4 transition-colors last:border-0 hover:bg-brand-50/40 sm:flex-row sm:items-center"
              >
                <button onClick={() => router.push(`/requests/${r.id}`)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[12px] font-bold text-brand-600">{r.id}</span>
                    <StatusBadge status={r.status} size="sm" />
                    <PriorityBadge priority={r.priority} />
                    {r.dueDate && new Date(r.dueDate).getTime() < Date.now() && (
                      <span className="rounded bg-bad-50 px-1.5 py-px text-[10.5px] font-bold text-bad-600">Просрочено</span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[14px] font-semibold text-ink-900 group-hover:text-brand-700">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-500">
                    {r.categoryName} · {r.authorMasked ? "Анонимно" : r.authorName} · {timeAgo(r.createdAt)}
                  </div>
                </button>
                <div className="flex shrink-0 gap-2">
                  {r.status === "NEW" && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await changeStatus(r, "IN_REVIEW", `${user.name} принял обращение на рассмотрение`);
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      На рассмотрение
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/requests/${r.id}`)}>
                    Открыть
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">На рассмотрении</h2>
          </div>
          {review.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-ink-400">Пусто</div>
          ) : (
            <div>
              {review.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/requests/${r.id}`)}
                  className="block w-full border-b border-ink-50 px-5 py-3 text-left transition-colors last:border-0 hover:bg-brand-50/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="num text-[12px] font-bold text-brand-600">{r.id}</span>
                    <span className="truncate text-[13.5px] font-semibold text-ink-900">{r.title}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-500">
                    {r.categoryName} · {timeAgo(r.lastActivityAt)}
                    {r.commentCount > 0 && ` · ${r.commentCount} комм.`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">В работе / одобрено</h2>
          </div>
          {work.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-ink-400">Пусто</div>
          ) : (
            <div>
              {work.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/requests/${r.id}`)}
                  className="block w-full border-b border-ink-50 px-5 py-3 text-left transition-colors last:border-0 hover:bg-brand-50/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="num text-[12px] font-bold text-brand-600">{r.id}</span>
                    <StatusBadge status={r.status} size="sm" />
                    <span className="truncate text-[13.5px] font-semibold text-ink-900">{r.title}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-500">
                    {r.categoryName} · {timeAgo(r.lastActivityAt)}
                    {r.dueDate && ` · срок: ${new Date(r.dueDate).toLocaleDateString("ru-RU")}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-center">
        <Link href="/requests">
          <Button variant="secondary">
            <Clock size={15} />
            Смотреть все обращения в реестре
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ManagerPanelPage() {
  return (
    <RequireRole roles={["MANAGER"]}>
      <ManagerPanelInner />
    </RequireRole>
  );
}
