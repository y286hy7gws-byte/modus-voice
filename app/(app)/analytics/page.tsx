"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Inbox,
  CheckCircle2,
  Trophy,
  Percent,
  Timer,
  Repeat2,
  MessageSquareText,
  ListChecks,
  Flag,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { enrichAll } from "@/lib/selectors";
import { STATUSES, STATUS_ORDER, TYPES } from "@/lib/constants";
import { computeTzMetrics, findRepeatedProblems } from "@/lib/analytics-metrics";
import type { RequestStatus, RequestType } from "@/lib/types";
import { cn, formatHours, lastNMonths, monthKey, monthLabel } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Card, SectionTitle } from "@/components/ui/kit";
import { TrendAreaChart, HBarChart, DonutChart, VBarChart } from "@/components/charts";

function useMonths(n = 8) {
  return useMemo(() => lastNMonths(n), [n]);
}

export default function AnalyticsPage() {
  const { user, snapshot } = useApp();
  const months = useMonths(8);

  const view = useMemo(() => {
    if (!user || !snapshot) return null;
    const isAdmin = user.role === "ADMIN";
    const all = isAdmin ? enrichAll(snapshot, user) : [];

    // Monthly buckets
    const created = new Map<string, number>(months.map((m) => [m, 0]));
    const implementedM = new Map<string, number>(months.map((m) => [m, 0]));
    for (const r of all) {
      const m = monthKey(r.createdAt);
      if (created.has(m)) created.set(m, (created.get(m) ?? 0) + 1);
      if (r.resolvedAt && r.status === "IMPLEMENTED") {
        const rm = monthKey(r.resolvedAt);
        if (implementedM.has(rm)) implementedM.set(rm, (implementedM.get(rm) ?? 0) + 1);
      }
    }
    const trend = months.map((m) => ({
      label: monthLabel(m),
      Создано: created.get(m) ?? 0,
      Реализовано: implementedM.get(m) ?? 0,
    }));
    const implementedByMonth = months.map((m) => ({
      label: monthLabel(m),
      value: implementedM.get(m) ?? 0,
    }));

    const byCategory = snapshot.categories
      .map((c) => ({ label: c.name, value: all.filter((r) => r.categoryId === c.id).length }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const statusColors: Record<RequestStatus, string> = {
      NEW: "#3b82f6",
      IN_REVIEW: "#f59e0b",
      NEEDS_INFO: "#818cf8",
      APPROVED: "#10b981",
      REJECTED: "#ef4444",
      IN_PROGRESS: "#4f46e5",
      IMPLEMENTED: "#059669",
    };
    const byStatus = STATUS_ORDER.filter((s) => all.some((r) => r.status === s)).map((s) => ({
      label: STATUSES[s].label,
      value: all.filter((r) => r.status === s).length,
      color: statusColors[s],
    }));

    // Cycle time buckets
    const resolved = all.filter((r) => r.resolvedAt).map((r) => (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / (3.6e6 * 24));
    const avgDays = resolved.length ? resolved.reduce((a, b) => a + b, 0) / resolved.length : 0;
    const fast = resolved.filter((d) => d <= 7).length;

    // Метрики ТЗ 2.7: время первого ответа, доля рассмотренных, доля с результатом
    const tz = computeTzMetrics(all, snapshot.comments, snapshot.history);
    const repeated = findRepeatedProblems(all, 30, 2);
    const byType = (Object.keys(TYPES) as RequestType[])
      .map((t) => ({ label: TYPES[t].label, value: all.filter((r) => r.type === t).length }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    return { isAdmin, all, trend, implementedByMonth, byCategory, byStatus, avgDays, fast, tz, repeated, byType };
  }, [user, snapshot, months]);

  if (!user || !snapshot || !view) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[110px]" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  const ps = snapshot.publicStats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Аналитика"
        subtitle={
          view.isAdmin
            ? "Все показатели вычисляются из реального реестра обращений — напрямую из данных системы."
            : "Публичная результативность системы обратной связи компании."
        }
      />

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Inbox size={18} />} label="Всего обращений" value={ps.total} accent="info" />
        <StatCard
          icon={<Timer size={18} />}
          label="Среднее время решения"
          value={formatHours(ps.avgResolutionHours)}
          sub={view.isAdmin ? `Быстро (≤7 дней): ${view.fast} из ${view.all.filter((r) => r.resolvedAt).length}` : undefined}
          accent="brand"
        />
        <StatCard icon={<Percent size={18} />} label="Доля реализованных" value={`${ps.implementationRate.toFixed(0)}%`} accent="good" />
        <StatCard icon={<Trophy size={18} />} label="Реализовано идей" value={ps.implemented} sub="Воплощено в компании" accent="warn" />
      </div>

      {view.isAdmin ? (
        <>
          {/* Метрики по ТЗ 2.7 */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<MessageSquareText size={18} />}
              label="Время до первого ответа"
              value={view.tz.avgFirstResponseHours != null ? formatHours(view.tz.avgFirstResponseHours) : "—"}
              sub={`Первый ответ получен по ${view.tz.answeredCount} из ${view.tz.total}`}
              accent="info"
            />
            <StatCard icon={<ListChecks size={18} />} label="Доля рассмотренных" value={`${view.tz.reviewedShare.toFixed(0)}%`} sub="Взяты в работу ответственных" accent="brand" />
            <StatCard icon={<Flag size={18} />} label="С зафиксированным результатом" value={`${view.tz.decidedShare.toFixed(0)}%`} sub="Реализовано или отклонено с объяснением" accent="good" />
            <StatCard icon={<Trophy size={18} />} label="Реализованных улучшений" value={view.tz.implementedCount} sub="Внедрено по итогам обращений" accent="warn" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>Динамика обращений</SectionTitle>
              <TrendAreaChart data={view.trend} keys={[{ key: "Создано", label: "Создано" }, { key: "Реализовано", label: "Реализовано" }]} height={260} />
            </Card>
            <Card className="p-5">
              <SectionTitle>Распределение по статусам</SectionTitle>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="w-full max-w-[220px]">
                  <DonutChart data={view.byStatus} height={200} />
                </div>
                <div className="w-full flex-1 space-y-1.5">
                  {view.byStatus.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-[12.5px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1 text-ink-600">{s.label}</span>
                      <span className="num font-bold text-ink-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>Обращения по категориям</SectionTitle>
              <HBarChart data={view.byCategory} height={Math.max(220, view.byCategory.length * 42)} />
            </Card>
            <Card className="p-5">
              <SectionTitle>Реализованные идеи по месяцам</SectionTitle>
              <VBarChart data={view.implementedByMonth} height={Math.max(220, 250)} />
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {/* Повторяющиеся проблемы */}
            <Card className="p-5">
              <SectionTitle>Повторяющиеся проблемы</SectionTitle>
              <p className="mb-3 text-[12px] text-ink-400">
                Темы, по которым за последние 30 дней поступило два и более обращения, — сигнал о системной проблеме
                или направлении улучшения процессов.
              </p>
              {view.repeated.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-good-50 px-3.5 py-3 text-[12.5px] text-good-700">
                  <CheckCircle2 size={15} />
                  Повторяющихся тем за месяц нет.
                </div>
              ) : (
                <div className="space-y-1">
                  {view.repeated.map((rep) => {
                    const catName = snapshot.categories.find((c) => c.id === rep.categoryId)?.name ?? "Без категории";
                    const isNewestOpen = rep.open > 0;
                    return (
                      <Link
                        key={rep.categoryId}
                        href={`/requests/${rep.ids[rep.ids.length - 1]}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          isNewestOpen
                            ? "border-warn-100 bg-warn-50/50 hover:bg-warn-50"
                            : "border-ink-100 bg-ink-50/60 hover:bg-ink-50",
                        )}
                      >
                        <Repeat2 size={15} className={cn("shrink-0", isNewestOpen ? "text-warn-600" : "text-ink-400")} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-900">{catName}</span>
                        <span className="num shrink-0 text-[11.5px] text-ink-500">
                          открыто: {rep.open} из {rep.count}
                        </span>
                        <span
                          className={cn(
                            "num flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white",
                            isNewestOpen ? "bg-warn-500" : "bg-ink-400",
                          )}
                        >
                          {rep.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Обращения по типам */}
            <Card className="p-5">
              <SectionTitle>Обращения по типам</SectionTitle>
              {view.byType.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-ink-400">Нет данных</div>
              ) : (
                <HBarChart data={view.byType} height={Math.max(200, view.byType.length * 44)} />
              )}
            </Card>
          </div>

          <Card className="p-5">
            <SectionTitle>Скорость и дисциплина</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-100 px-4 py-3.5">
                <div className="num text-[22px] font-extrabold text-ink-900">{view.avgDays.toFixed(1)} дн</div>
                <div className="text-[12px] text-ink-500">средний цикл обращения — от регистрации до решения</div>
              </div>
              <div className="rounded-xl border border-ink-100 px-4 py-3.5">
                <div className="num text-[22px] font-extrabold text-good-700">
                  {(() => {
                    const resolvedTotal = view.all.filter((r) => r.resolvedAt).length;
                    return resolvedTotal ? Math.round((view.fast / resolvedTotal) * 100) : 0;
                  })()}
                  %
                </div>
                <div className="text-[12px] text-ink-500">решений приняты за 7 дней или быстрее</div>
              </div>
              <div className="rounded-xl border border-ink-100 px-4 py-3.5">
                <div className="num text-[22px] font-extrabold text-ink-900">
                  {(() => {
                    const last = view.trend[view.trend.length - 1];
                    const prev = view.trend[view.trend.length - 2];
                    if (!prev || prev["Создано"] === 0) return "—";
                    const diff = Math.round((((last["Создано"] as number) - (prev["Создано"] as number)) / (prev["Создано"] as number)) * 100);
                    return `${diff > 0 ? "+" : ""}${diff}%`;
                  })()}
                </div>
                <div className="text-[12px] text-ink-500">изменение активности за последний месяц</div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* Public metrics for employee/manager */
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5">
            <SectionTitle>Результативность системы</SectionTitle>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="font-semibold text-ink-600">Обращения достигают решения</span>
                  <span className="num font-bold text-ink-900">
                    {Math.round(((ps.implemented + (snapshot.publicStatusCounts?.REJECTED ?? 0)) / Math.max(1, ps.total)) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r from-good-500 to-good-600 transition-all duration-700")}
                    style={{ width: `${Math.min(100, ((ps.implemented + (snapshot.publicStatusCounts?.REJECTED ?? 0)) / Math.max(1, ps.total)) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="font-semibold text-ink-600">Доля реализованных предложений</span>
                  <span className="num font-bold text-ink-900">{ps.implementationRate.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700" style={{ width: `${Math.min(100, ps.implementationRate)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-ink-100 px-3.5 py-3">
                  <div className="num text-[20px] font-extrabold text-ink-900">{formatHours(ps.avgResolutionHours)}</div>
                  <div className="text-[11.5px] text-ink-500">среднее время до решения</div>
                </div>
                <div className="rounded-xl border border-ink-100 px-3.5 py-3">
                  <div className="num text-[20px] font-extrabold text-good-700">{snapshot.publicStatusCounts?.IN_PROGRESS ?? 0}</div>
                  <div className="text-[11.5px] text-ink-500">идеи сейчас в работе</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle>Статусы обращений компании</SectionTitle>
            <div className="space-y-2.5">
              {STATUS_ORDER.map((s: RequestStatus) => {
                const count = snapshot.publicStatusCounts?.[s] ?? 0;
                const total = ps.total || 1;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-[150px] shrink-0 text-[12.5px] font-medium text-ink-600">{STATUSES[s].label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700")}
                        style={{
                          width: `${(count / total) * 100}%`,
                          background: {
                            NEW: "#3b82f6",
                            IN_REVIEW: "#f59e0b",
                            NEEDS_INFO: "#818cf8",
                            APPROVED: "#10b981",
                            REJECTED: "#ef4444",
                            IN_PROGRESS: "#4f46e5",
                            IMPLEMENTED: "#059669",
                          }[s],
                        }}
                      />
                    </div>
                    <span className="num w-6 text-right text-[12px] font-bold text-ink-700">{count}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
              Статистика носит публичный характер и не раскрывает содержание обращений. Детальная аналитика доступна
              руководителям и администратору.
            </p>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2 text-[12px] text-ink-400">
        <CheckCircle2 size={14} className="text-good-500" />
        Показатели пересчитываются автоматически при каждом изменении данных системы.
      </div>
    </div>
  );
}
