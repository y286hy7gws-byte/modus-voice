"use client";

import { useMemo, useState } from "react";
import { Search, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { enrichAll } from "@/lib/selectors";
import type { RequestStatus, Priority } from "@/lib/types";
import { STATUSES, STATUS_ORDER, PRIORITIES, PRIORITIES_ORDER, OPEN_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/app-shell";
import { RequestTable } from "@/components/request-table";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui/kit";
import { RequireRole } from "@/components/route-guard";

type Mine = "all" | "assigned" | "authored";
type DueFilter = "all" | "overdue" | "week" | "none";

function AllRequestsInner() {
  const { user, snapshot } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | RequestStatus>("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [department, setDepartment] = useState("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [scope, setScope] = useState<Mine>("all");

  const requests = useMemo(
    () => (user && snapshot ? enrichAll(snapshot, user) : []),
    [user, snapshot],
  );

  // Отдел автора (для фильтра по подразделению; анонимные обращения без автора не имеют отдела)
  const authorDept = useMemo(() => {
    const m: Record<string, string> = {};
    if (snapshot) for (const p of snapshot.profiles) m[p.id] = p.department;
    return m;
  }, [snapshot]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of requests) {
      if (!r.authorId) continue;
      const d = authorDept[r.authorId];
      if (d) set.add(d);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [requests, authorDept]);

  const attachments = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of requests) if (r.attachmentCount) m[r.id] = r.attachmentCount;
    return m;
  }, [requests]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      assigned: requests.filter((r) => r.assigneeId === user?.id).length,
      authored: requests.filter((r) => r.authorId === user?.id).length,
    }),
    [requests, user],
  );

  const filtered = useMemo(() => {
    let list = requests;
    if (scope === "assigned") list = list.filter((r) => r.assigneeId === user?.id);
    if (scope === "authored") list = list.filter((r) => r.authorId === user?.id);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    if (status !== "all") list = list.filter((r) => r.status === status);
    if (category !== "all") list = list.filter((r) => r.categoryId === category);
    if (priority !== "all") list = list.filter((r) => r.priority === priority);
    if (department !== "all") {
      list = list.filter((r) => (r.authorId ? authorDept[r.authorId] === department : false));
    }
    if (due !== "all") {
      const nowMs = Date.now();
      list = list.filter((r) => {
        if (due === "none") return !r.dueDate;
        if (!r.dueDate) return false;
        const open = OPEN_STATUSES.includes(r.status);
        const t = new Date(r.dueDate).getTime();
        if (due === "overdue") return open && t < nowMs;
        return open && t >= nowMs && t <= nowMs + 7 * 86400000;
      });
    }
    return list;
  }, [requests, scope, query, status, category, priority, department, due, user, authorDept]);

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-14" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Все обращения"
        subtitle={
          user.role === "ADMIN"
            ? "Полный реестр обращений компании. Управляйте статусами, ответственными и приоритетами."
            : "Обращения, которые вы ведёте, и обращения, отправленные вами лично."
        }
        actions={
          <Link href="/requests/new">
            <Button variant="secondary">
              <PlusCircle size={15} />
              Создать обращение
            </Button>
          </Link>
        }
      />

      {/* Filter bar */}
      <Card className="mb-4 p-3.5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-[320px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input
                className="pl-9"
                placeholder="Поиск по номеру, заголовку, тексту…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <Select value={status} onChange={(e) => setStatus(e.target.value as never)} className="w-[190px]">
                <option value="all">Все статусы</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUSES[s].label}
                  </option>
                ))}
              </Select>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as never)} className="w-[170px]">
                <option value="all">Любой приоритет</option>
                {PRIORITIES_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITIES[p].label}
                  </option>
                ))}
              </Select>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-[180px]">
                <option value="all">Все категории</option>
                {snapshot.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-[170px]">
                <option value="all">Все подразделения</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <Select value={due} onChange={(e) => setDue(e.target.value as DueFilter)} className="w-[160px]">
                <option value="all">Любой срок</option>
                <option value="overdue">Просроченные</option>
                <option value="week">Срок до 7 дней</option>
                <option value="none">Без срока</option>
              </Select>
            </div>
          </div>
          {user.role === "MANAGER" && (
            <div className="flex items-center gap-2 border-t border-ink-100 pt-3">
              <span className="text-[12px] font-semibold text-ink-400">Показать:</span>
              {(
                [
                  ["all", "Всё", counts.all],
                  ["assigned", "Назначенные мне", counts.assigned],
                  ["authored", "Мои", counts.authored],
                ] as Array<[Mine, string, number]>
              ).map(([val, label, c]) => (
                <button
                  key={val}
                  onClick={() => setScope(val)}
                  className={
                    scope === val
                      ? "rounded-full bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white"
                      : "rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:bg-ink-50"
                  }
                >
                  {label} <span className="num opacity-70">{c}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={26} />}
            title="Ничего не найдено"
            description="Попробуйте изменить поисковый запрос или сбросить фильтры."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setPriority("all");
                  setCategory("all");
                  setDepartment("all");
                  setDue("all");
                  setScope("all");
                }}
              >
                Сбросить фильтры
              </Button>
            }
          />
        </Card>
      ) : (
        <RequestTable requests={filtered} viewer={user} />
      )}
    </div>
  );
}

export default function AllRequestsPage() {
  return (
    <RequireRole roles={["MANAGER", "ADMIN"]}>
      <AllRequestsInner />
    </RequireRole>
  );
}
