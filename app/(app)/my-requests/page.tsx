"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Inbox, Filter, PlusCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { enrichAll } from "@/lib/selectors";
import { STATUSES, STATUS_ORDER } from "@/lib/constants";
import { PageHeader } from "@/components/app-shell";
import { RequestListItem } from "@/components/request-list-item";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui/kit";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

export default function MyRequestsPage() {
  const { user, snapshot } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "open" | RequestStatus>("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const all = useMemo(
    () => (user && snapshot ? enrichAll(snapshot, user).filter((r) => r.authorId === user.id) : []),
    [user, snapshot],
  );

  const filtered = useMemo(() => {
    let list = all;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    if (status === "open") list = list.filter((r) => !["IMPLEMENTED", "REJECTED"].includes(r.status));
    else if (status !== "all") list = list.filter((r) => r.status === status);
    if (category !== "all") list = list.filter((r) => r.categoryId === category);
    if (sort === "newest") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "oldest") list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sort === "activity") list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    return list;
  }, [all, query, status, category, sort]);

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-60" />
        <div className="skeleton h-14" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Мои обращения"
        subtitle="Все обращения, которые вы отправили в систему, и их текущие статусы."
        actions={
          <Link href="/requests/new">
            <Button>
              <PlusCircle size={15} />
              Создать обращение
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card className="mb-4 p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-[340px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              className="pl-9"
              placeholder="Поиск по номеру, заголовку, тексту…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              <FilterChip active={status === "all"} onClick={() => setStatus("all")} label="Все" count={all.length} />
              <FilterChip
                active={status === "open"}
                onClick={() => setStatus("open")}
                label="Активные"
                count={all.filter((r) => !["IMPLEMENTED", "REJECTED"].includes(r.status)).length}
              />
              {STATUS_ORDER.map((s) => {
                const count = all.filter((r) => r.status === s).length;
                if (count === 0) return null;
                return (
                  <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} label={STATUSES[s].label} count={count} />
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-[170px]">
                <option value="all">Все категории</option>
                {snapshot.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-[150px]">
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
                <option value="activity">По активности</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={all.length === 0 ? <Inbox size={26} /> : <Search size={26} />}
            title={all.length === 0 ? "Пока нет ни одного обращения" : "Ничего не найдено"}
            description={
              all.length === 0
                ? "Отправьте первое обращение — идея, проблема или предложение по работе компании."
                : "Измените поисковый запрос или сбросьте фильтры."
            }
            action={
              all.length === 0 ? (
                <Link href="/requests/new">
                  <Button>
                    <PlusCircle size={15} />
                    Создать обращение
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setCategory("all");
                  }}
                >
                  <Filter size={15} />
                  Сбросить фильтры
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {filtered.map((r) => (
            <RequestListItem key={r.id} request={r} />
          ))}
        </Card>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-sm"
          : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      {label}
      <span className={cn("num rounded-full px-1.5 text-[10.5px]", active ? "bg-white/25" : "bg-ink-100")}>{count}</span>
    </button>
  );
}
