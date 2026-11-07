"use client";

import { useMemo, useState } from "react";
import { Search, Users, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { OPEN_STATUSES } from "@/lib/constants";
import { ROLES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { PageHeader } from "@/components/app-shell";
import { RequireRole } from "@/components/route-guard";
import { Avatar, Button, Card, EmptyState, Field, Input, Menu, MenuItem, Select, Modal } from "@/components/ui/kit";
import { toast } from "@/components/ui/toast";

function UsersPageInner() {
  const { user, snapshot, createUser, updateUser, deleteUser } = useApp();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("demo12345");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    if (!user || !snapshot) return [];
    let list = snapshot.profiles.map((p) => {
      const created = snapshot.requests.filter((r) => r.authorId === p.id).length;
      const assigned = snapshot.requests.filter((r) => r.assigneeId === p.id);
      const assignedOpen = assigned.filter((r) => OPEN_STATUSES.includes(r.status)).length;
      const implemented = assigned.filter((r) => r.status === "IMPLEMENTED").length;
      return { profile: p, created, assignedOpen, implemented, assignedTotal: assigned.length };
    });
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.profile.name.toLowerCase().includes(q) || r.profile.email.toLowerCase().includes(q) || r.profile.department.toLowerCase().includes(q));
    if (roleFilter !== "all") list = list.filter((r) => r.profile.role === roleFilter);
    return list;
  }, [user, snapshot, query, roleFilter]);

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-52" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  const doCreate = async () => {
    if (!name.trim() || !email.trim() || !role) {
      toast("warning", "Заполните обязательные поля", "Имя, e-mail и роль обязательны.");
      return;
    }
    setBusy(true);
    const ok = await createUser({
      name,
      email,
      role,
      position: position || "Сотрудник",
      department: department || "Общий отдел",
      password: password || undefined,
    });
    setBusy(false);
    if (ok) {
      setCreateModal(false);
      setName("");
      setEmail("");
      setRole("EMPLOYEE");
      setPosition("");
      setDepartment("");
      setPassword("demo12345");
    }
  };

  return (
    <div>
      <PageHeader
        title="Пользователи"
        subtitle="Управление учётными записями и ролями. Роли определяют права доступа в системе."
        actions={
          <Button onClick={() => setCreateModal(true)}>
            <UserPlus size={15} />
            Добавить пользователя
          </Button>
        }
      />

      <Card className="mb-4 p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-[320px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input className="pl-9" placeholder="Поиск по имени, e-mail, отделу…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            {(
              [
                ["all", "Все роли"],
                ["EMPLOYEE", ROLES.EMPLOYEE.label],
                ["MANAGER", ROLES.MANAGER.label],
                ["ADMIN", ROLES.ADMIN.label],
              ] as Array<["all" | Role, string]>
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRoleFilter(val)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  roleFilter === val
                    ? "bg-brand-600 text-white"
                    : "border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Search size={26} />} title="Ничего не найдено" description="Измените запрос или фильтр по ролям." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60">
                  <th className="th">Сотрудник</th>
                  <th className="th w-[148px]">Роль</th>
                  <th className="th w-[170px]">Отдел</th>
                  <th className="th w-[128px] text-center">Отправлено</th>
                  <th className="th w-[128px] text-center">Назначено</th>
                  <th className="th w-[120px]">В системе с</th>
                  <th className="th w-[70px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isSelf = r.profile.id === user.id;
                  return (
                    <tr key={r.profile.id} className="border-b border-ink-50 transition-colors last:border-0 hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.profile.name} color={r.profile.color} size={34} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink-900">
                              {r.profile.name}
                              {isSelf && <span className="rounded bg-ink-100 px-1 py-px text-[10px] font-bold text-ink-500">ВЫ</span>}
                            </div>
                            <div className="truncate text-[11.5px] text-ink-400">{r.profile.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={r.profile.role}
                          className="h-8 w-[140px] text-[12.5px]"
                          disabled={isSelf}
                          onChange={(e) => void updateUser(r.profile.id, { role: e.target.value as Role })}
                        >
                          <option value="EMPLOYEE">{ROLES.EMPLOYEE.label}</option>
                          <option value="MANAGER">{ROLES.MANAGER.label}</option>
                          <option value="ADMIN">{ROLES.ADMIN.label}</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-ink-600">{r.profile.department}</td>
                      <td className="num px-4 py-3 text-center text-[13px] font-semibold text-ink-700">{r.created}</td>
                      <td className="num px-4 py-3 text-center text-[13px]">
                        {r.profile.role !== "EMPLOYEE" ? (
                          <span>
                            <span className="font-bold text-ink-900">{r.assignedOpen}</span>
                            <span className="text-[11.5px] text-ink-400"> откр. · реализ. {r.implemented}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-500">{formatDate(r.profile.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Удалить пользователя"
                            onClick={() => {
                              if (window.confirm(`Удалить пользователя ${r.profile.name}? Обращения, отправленные им, также будут удалены.`)) {
                                void deleteUser(r.profile.id);
                              }
                            }}
                          >
                            <Trash2 size={15} className="text-ink-400 transition-colors hover:text-bad-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Добавить пользователя"
        description="Учётная запись создаётся сразу и получает доступ к системе."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModal(false)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={() => void doCreate()}>
              Создать
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="ФИО">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя Фамилия" />
          </Field>
          <Field label="Корпоративный e-mail">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@modus.demo" type="email" />
          </Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Роль">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="EMPLOYEE">{ROLES.EMPLOYEE.label}</option>
                <option value="MANAGER">{ROLES.MANAGER.label}</option>
                <option value="ADMIN">{ROLES.ADMIN.label}</option>
              </Select>
            </Field>
            <Field label="Отдел">
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Департамент…" />
            </Field>
          </div>
          <Field label="Должность">
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Должность сотрудника" />
          </Field>
          <Field label="Пароль" hint="Демо-режим: можно оставить стандартный пароль demo12345">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <UsersPageInner />
    </RequireRole>
  );
}
