"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  PlusCircle,
  CheckCircle2,
  Timer,
  ArrowRight,
  FolderOpen,
  Activity,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { enrichAll } from "@/lib/selectors";
import { OPEN_STATUSES, STATUSES } from "@/lib/constants";
import { formatHours, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { RequestListItem } from "@/components/request-list-item";
import { Button, Card, EmptyState } from "@/components/ui/kit";

const hour = new Date().getHours();
const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

export default function DashboardPage() {
  const { user, snapshot } = useApp();
  const router = useRouter();

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[110px]" />
          ))}
        </div>
        <div className="skeleton h-80" />
      </div>
    );
  }

  const mine = enrichAll(snapshot, user)
    .filter((r) => r.authorId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const active = mine.filter((r) => OPEN_STATUSES.includes(r.status));
  const implemented = mine.filter((r) => r.status === "IMPLEMENTED");
  const resolved = mine.filter((r) => r.resolvedAt);
  const avgMine = resolved.length
    ? resolved.reduce((a, r) => a + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / 3.6e6, 0) /
      resolved.length
    : 0;

  const ps = snapshot.publicStats;
  const statusPalette: Record<string, string> = {
    NEW: "#3b82f6",
    IN_REVIEW: "#f59e0b",
    NEEDS_INFO: "#818cf8",
    APPROVED: "#10b981",
    IN_PROGRESS: "#4f46e5",
    REJECTED: "#ef4444",
    IMPLEMENTED: "#059669",
  };
  const psCounts = snapshot.publicStatusCounts ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle="Ваш персональный дашборд наблюдает за каждым вашим обращением — от регистрации до решения."
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push("/my-requests")}>
              <Inbox size={15} />
              Мои обращения
            </Button>
            <Button onClick={() => router.push("/requests/new")}>
              <PlusCircle size={15} />
              Создать обращение
            </Button>
          </>
        }
      />

      {/* KPI по личной активности */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Inbox size={18} />} label="Всего обращений" value={mine.length} sub={`Активных: ${active.length}`} accent="info" />
        <StatCard icon={<Activity size={18} />} label="В работе / рассмотрении" value={active.length} sub="Требуют внимания или решения" accent="brand" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Реализовано" value={implemented.length} sub={`Отклонено: ${mine.filter((r) => r.status === "REJECTED").length}`} accent="good" />
        <StatCard icon={<Timer size={18} />} label="Среднее время" value={formatHours(avgMine)} sub="От регистрации до решения" accent="warn" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        {/* Recent mine */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5 sm:px-5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Мои обращения</h2>
            <Link href="/my-requests" className="link text-[12.5px]">
              Все обращения <ArrowRight size={12} className="ml-0.5 inline" />
            </Link>
          </div>
          {mine.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={26} />}
              title="У вас пока нет обращений"
              description="Заметили проблему, есть идея или предложение по улучшению? Отправьте первое обращение — система зафиксирует его и передаст ответственному."
              action={
                <Button onClick={() => router.push("/requests/new")}>
                  <PlusCircle size={15} />
                  Создать первое обращение
                </Button>
              }
            />
          ) : (
            <div>
              {mine.slice(0, 6).map((r) => (
                <RequestListItem key={r.id} request={r} />
              ))}
            </div>
          )}
        </Card>

        {/* Public stats */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Обратная связь в компании</h2>
            <p className="mt-1 text-[12.5px] text-ink-500">Публичная статистика обращений всего коллектива.</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-3.5 py-3">
                <div className="num text-[24px] font-extrabold tracking-[-0.02em] text-ink-900">{ps.total}</div>
                <div className="text-[11.5px] font-semibold text-ink-500">всего обращений</div>
              </div>
              <div className="rounded-xl border border-good-100 bg-good-50/60 px-3.5 py-3">
                <div className="num text-[24px] font-extrabold tracking-[-0.02em] text-good-700">{ps.implemented}</div>
                <div className="text-[11.5px] font-semibold text-good-700">реализовано</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                <span className="font-semibold text-ink-600">Доля реализованных</span>
                <span className="num font-bold text-ink-900">{ps.implementationRate.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-good-500 to-good-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, ps.implementationRate)}%` }}
                />
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
                Каждая {ps.implementationRate >= 20 ? "пятая" : ps.implemented > 0 ? "несколько" : ""} поданная идея
                доходит до реализации — предложения не остаются только на бумаге.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Статусная картина</h2>
            <p className="mt-1 text-[12.5px] text-ink-500">Как устроены обращения компании по статусам.</p>
            <div className="mt-4 space-y-2.5">
              {(
                [
                  ["NEW", psCounts.NEW ?? 0],
                  ["IN_REVIEW", psCounts.IN_REVIEW ?? 0],
                  ["IN_PROGRESS", psCounts.IN_PROGRESS ?? 0],
                  ["IMPLEMENTED", psCounts.IMPLEMENTED ?? 0],
                  ["REJECTED", psCounts.REJECTED ?? 0],
                ] as Array<[keyof typeof STATUSES, number]>
              ).map(([st, count]) => {
                const total = ps.total || 1;
                return (
                  <div key={st} className="flex items-center gap-3">
                    <span className="w-[132px] shrink-0 text-[12.5px] font-medium text-ink-600">{STATUSES[st].label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / total) * 100}%`, background: statusPalette[st] }}
                      />
                    </div>
                    <span className="num w-6 text-right text-[12px] font-bold text-ink-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Последние события</h2>
            {snapshot.notifications.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink-400">Уведомлений пока нет.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {snapshot.notifications.slice(0, 4).map((n) => (
                  <Link
                    key={n.id}
                    href={n.requestId ? `/requests/${n.requestId}` : "/notifications"}
                    className="flex items-start gap-2.5 group"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-ink-200" : "bg-brand-500"}`}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold text-ink-800 group-hover:text-brand-700">
                        {n.title}
                      </div>
                      <div className="truncate text-[11.5px] text-ink-400">{timeAgo(n.createdAt)}</div>
                    </div>
                  </Link>
                ))}
                <Link href="/notifications" className="link block text-[12.5px]">
                  Все уведомления <ArrowRight size={12} className="ml-0.5 inline" />
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
