"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Inbox,
  Timer,
  ShieldCheck,
  Percent,
  FolderTree,
  Plus,
  ShieldAlert,
  Route,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { enrichAll } from "@/lib/selectors";
import { OPEN_STATUSES, STATUSES, STATUS_ORDER } from "@/lib/constants";
import { formatHours, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/badges";
import { RequireRole } from "@/components/route-guard";
import { HBarChart } from "@/components/charts";
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Modal,
  SectionTitle,
  Select,
} from "@/components/ui/kit";
import { useState } from "react";

function AdminPanelInner() {
  const { user, snapshot, addCategory, updateCategory, setRoutingRule } = useApp();
  const router = useRouter();
  const [catModal, setCatModal] = useState(false);
  const [newCat, setNewCat] = useState("");

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-28" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  const all = enrichAll(snapshot, user);
  const now = Date.now();
  const newOnes = all.filter((r) => r.status === "NEW");
  const open = all.filter((r) => OPEN_STATUSES.includes(r.status));
  const implemented = all.filter((r) => r.status === "IMPLEMENTED");
  const rejected = all.filter((r) => r.status === "REJECTED");
  const overdue = all.filter(
    (r) => r.dueDate && new Date(r.dueDate).getTime() < now && OPEN_STATUSES.includes(r.status),
  );
  const unassigned = all.filter((r) => !r.assigneeId && OPEN_STATUSES.includes(r.status));
  const resolved = all.filter((r) => r.resolvedAt);
  const avg = resolved.length
    ? resolved.reduce((a, r) => a + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / 3.6e6, 0) /
      resolved.length
    : 0;
  const ps = snapshot.publicStats;

  // Workload by manager
  const managers = snapshot.profiles.filter((p) => p.role === "MANAGER" || p.role === "ADMIN");
  const workload = managers
    .map((m) => {
      const mine = all.filter((r) => r.assigneeId === m.id);
      const mineOpen = mine.filter((r) => OPEN_STATUSES.includes(r.status));
      const mineClosed = mine.filter((r) => r.resolvedAt);
      const mineAvg = mineClosed.length
        ? mineClosed.reduce((a, r) => a + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / 3.6e6, 0) /
          mineClosed.length
        : 0;
      return {
        profile: m,
        total: mine.length,
        open: mineOpen.length,
        done: mine.filter((r) => r.status === "IMPLEMENTED").length,
        avg: mineAvg,
        load: mineOpen.length,
      };
    })
    .sort((a, b) => b.open - a.open);

  const maxOpen = Math.max(1, ...workload.map((w) => w.open));

  // Category chart data
  const catCounts = snapshot.categories.map((c) => ({
    label: c.name,
    value: all.filter((r) => r.categoryId === c.id).length,
  }));
  const catData = catCounts.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Панель администратора"
        subtitle="Контроль всей системы: реестр, распределение нагрузки, сроки и результативность."
        actions={
          <>
            {unassigned.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-warn-50 px-3 py-1.5 text-[12px] font-bold text-warn-600">
                <ShieldAlert size={13} />
                Не назначено: {unassigned.length}
              </span>
            )}
            <Button variant="secondary" onClick={() => router.push("/requests")}>
              <Inbox size={15} />
              Реестр обращений
            </Button>
            <Link href="/users">
              <Button>
                <Users size={15} />
                Пользователи
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Inbox size={18} />} label="Всего обращений" value={ps.total} sub={`Новых: ${newOnes.length} · Открытых: ${open.length}`} accent="info" />
        <StatCard icon={<Timer size={18} />} label="Среднее время решения" value={formatHours(ps.avgResolutionHours)} sub={overdue.length ? `Просрочено: ${overdue.length}` : "Просрочек нет"} accent="brand" />
        <StatCard icon={<Percent size={18} />} label="Реализация" value={`${ps.implementationRate.toFixed(0)}%`} sub={`${ps.implemented} идей воплощено · ${rejected.length} отклонено`} accent="good" />
        <StatCard icon={<ShieldCheck size={18} />} label="Активные обращения" value={open.length} sub={`В работе: ${all.filter((r) => r.status === "IN_PROGRESS").length} · На рассмотрении: ${all.filter((r) => r.status === "IN_REVIEW").length}`} accent="warn" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Workload table */}
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <SectionTitle>Нагрузка ответственных</SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60">
                  <th className="th">Сотрудник</th>
                  <th className="th w-[110px]">В работе</th>
                  <th className="th w-[96px]">Реализовал</th>
                  <th className="th w-[110px]">Ср. скорость</th>
                  <th className="th w-[140px]">Нагрузка</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((w) => (
                  <tr key={w.profile.id} className="border-b border-ink-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.profile.name} color={w.profile.color} size={30} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink-900">{w.profile.name}</div>
                          <div className="truncate text-[11.5px] text-ink-400">{w.profile.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num px-4 py-3 text-[13px] font-bold text-ink-900">{w.open}</td>
                    <td className="num px-4 py-3 text-[13px] font-semibold text-good-700">{w.done}</td>
                    <td className="num px-4 py-3 text-[12.5px] text-ink-600">{w.avg ? formatHours(w.avg) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              w.open >= 4 ? "bg-bad-500" : w.open >= 2 ? "bg-warn-500" : "bg-good-500",
                            )}
                            style={{ width: `${(w.open / maxOpen) * 100}%` }}
                          />
                        </div>
                        <span className="num w-4 text-[11px] font-bold text-ink-400">{w.open}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          {/* Unassigned queue */}
          <Card className="overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-3.5">
              <SectionTitle>Требуют назначения</SectionTitle>
            </div>
            {unassigned.length === 0 ? (
              <div className="px-5 py-7 text-center text-[12.5px] text-ink-400">Все открытые обращения имеют ответственного.</div>
            ) : (
              <div>
                {unassigned.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/requests/${r.id}`)}
                    className="block w-full border-b border-ink-50 px-5 py-3 text-left transition-colors last:border-0 hover:bg-brand-50/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="num text-[12px] font-bold text-brand-600">{r.id}</span>
                      <span className="truncate text-[13px] font-semibold text-ink-900">{r.title}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-ink-500">
                      {r.categoryName} · {r.authorMasked ? "Анонимно" : r.authorName} · {timeAgo(r.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Categories management */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-ink-900">
                <FolderTree size={15} className="text-ink-400" />
                Категории
              </h2>
              <Button size="sm" variant="secondary" onClick={() => { setNewCat(""); setCatModal(true); }}>
                <Plus size={13} />
                Добавить
              </Button>
            </div>
            <div className="space-y-1">
              {snapshot.categories.map((c) => {
                const count = all.filter((r) => r.categoryId === c.id).length;
                return (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink-50">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", c.active ? "bg-brand-500" : "bg-ink-300")} />
                    <input
                      className={cn(
                        "min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium outline-none transition-colors hover:border-ink-200 focus:border-brand-300 focus:bg-surface",
                        !c.active && "text-ink-400 line-through",
                      )}
                      defaultValue={c.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== c.name) void updateCategory(c.id, { name: v });
                      }}
                    />
                    <span className="num text-[11px] font-bold text-ink-400">{count}</span>
                    <button
                      onClick={() => void updateCategory(c.id, { active: !c.active })}
                      disabled={c.system}
                      title={c.system ? "Системная категория всегда активна" : c.active ? "Скрыть из формы создания" : "Включить снова"}
                      className={cn(
                        "rounded-md px-1.5 py-1 text-[10.5px] font-bold uppercase tracking-wide transition-colors",
                        c.active ? "bg-good-50 text-good-700" : "bg-ink-100 text-ink-400",
                        !c.system && "hover:brightness-95",
                      )}
                    >
                      {c.active ? "акт." : "скр."}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
              Нажмите на название для переименования. Отключённые категории не отображаются при создании обращений.
            </p>
          </Card>
        </div>
      </div>

      {/* Маршрутизация по категориям */}
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <Route size={15} className="text-ink-400" />
          <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Маршрутизация по категориям</h2>
        </div>
        <p className="mb-4 text-[12.5px] text-ink-500">
          Правило по умолчанию: новое обращение автоматически направляется выбранному ответственному. Если правило не
          задано, обращение попадает в очередь «Требуют назначения».
        </p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.categories.map((c) => {
            const rule = snapshot.routing.find((x) => x.categoryId === c.id);
            const routed = all.filter((r) => r.categoryId === c.id).length;
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-ink-900">{c.name}</div>
                  <div className="num text-[10.5px] text-ink-400">обращений: {routed}</div>
                </div>
                <Select
                  value={rule?.assigneeId ?? ""}
                  onChange={(e) => void setRoutingRule(c.id, e.target.value || null)}
                  className="w-[190px] text-[12px]"
                  disabled={!c.active}
                >
                  <option value="">Не назначать (вручную)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        {/* Category distribution chart */}
        <Card className="p-5">
          <SectionTitle>Обращения по категориям</SectionTitle>
          {catData.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-400">Нет данных</div>
          ) : (
            <HBarChart data={catData} height={Math.max(200, catData.length * 44)} />
          )}
        </Card>

        {/* Latest registrations */}
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-3.5">
            <SectionTitle>Последние регистрации</SectionTitle>
          </div>
          <div>
            {[...all]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 6)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/requests/${r.id}`)}
                  className="flex w-full items-center gap-3 border-b border-ink-50 px-5 py-3 text-left transition-colors last:border-0 hover:bg-brand-50/40"
                >
                  <span className="num w-[74px] shrink-0 text-[12px] font-bold text-brand-600">{r.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink-900">{r.title}</span>
                    <span className="block text-[11.5px] text-ink-500">
                      {r.authorMasked ? "Анонимно" : r.authorName} · {timeAgo(r.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={r.status} size="sm" />
                </button>
              ))}
          </div>
          <div className="border-t border-ink-100 px-5 py-3 text-center">
            <Link href="/requests" className="link text-[12.5px]">
              Открыть полный реестр
            </Link>
          </div>
        </Card>
      </div>

      {/* Status distribution */}
      <Card className="p-5">
        <SectionTitle>Статусная картина компании</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {STATUS_ORDER.map((s: RequestStatus) => {
            const count = all.filter((r) => r.status === s).length;
            const total = all.length || 1;
            return (
              <div key={s} className="rounded-xl border border-ink-100 px-3.5 py-3">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUSES[s].dot)} />
                  <span className="truncate text-[11px] font-semibold text-ink-500">{STATUSES[s].label}</span>
                </div>
                <div className="num mt-1 text-[20px] font-extrabold text-ink-900">{count}</div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / total) * 100}%`,
                      background: count > 0 ? "#4f46e5" : "transparent",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={catModal}
        onClose={() => setCatModal(false)}
        title="Новая категория"
        description="Категория появится в форме создания обращений."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCatModal(false)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                const ok = await addCategory(newCat);
                if (ok) setCatModal(false);
              }}
            >
              Добавить
            </Button>
          </>
        }
      >
        <Field label="Название категории">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Например: Экология" />
        </Field>
      </Modal>
    </div>
  );
}

export default function AdminPanelPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <AdminPanelInner />
    </RequireRole>
  );
}
