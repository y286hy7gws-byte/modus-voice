"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, KeyRound, LogOut, Database, Palette, Info, RotateCcw, Radio, Monitor, Smartphone } from "lucide-react";
import { useApp } from "@/lib/store";
import { ROLES, DEMO_PASSWORD } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { Avatar, Button, Card, Field, Input, Select, SectionTitle } from "@/components/ui/kit";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const COLORS = [
  "#4f46e5",
  "#2563eb",
  "#0d9488",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#17181d",
];

export default function SettingsPage() {
  const { user, snapshot, backend, updateProfile, changePassword, signOut, resetDemo } = useApp();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [position, setPosition] = useState(user?.position ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [color, setColor] = useState(user?.color ?? "#4f46e5");
  const [saving, setSaving] = useState(false);

  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  const save = async () => {
    if (!name.trim()) {
      toast("warning", "Имя не может быть пустым");
      return;
    }
    setSaving(true);
    await updateProfile({ name: name.trim(), position: position.trim(), department: department.trim(), color });
    setSaving(false);
  };

  const doPass = async () => {
    if (pass.length < 8) {
      toast("warning", "Пароль слишком короткий", "Минимум 8 символов.");
      return;
    }
    if (pass !== pass2) {
      toast("warning", "Пароли не совпадают");
      return;
    }
    setPassBusy(true);
    const ok = await changePassword(pass);
    setPassBusy(false);
    if (ok) {
      setPass("");
      setPass2("");
    }
  };

  const isDemo = backend.mode === "demo";

  return (
    <div className="mx-auto max-w-[880px] space-y-5">
      <PageHeader
        title="Настройки профиля"
        subtitle="Личные данные, оформление и режим работы системы."
      />

      {/* Profile */}
      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50/60 to-surface px-5 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <Avatar name={name || user.name} color={color} size={56} />
            <div className="min-w-0">
              <div className="truncate text-[17px] font-extrabold text-ink-900">{name || user.name}</div>
              <div className="truncate text-[13px] text-ink-500">{user.email}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                <User size={11} />
                {ROLES[user.role].label}
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <SectionTitle>Персональные данные</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ФИО">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="E-mail" hint="E-mail изменяется администратором системы">
              <Input value={user.email} disabled />
            </Field>
            <Field label="Должность">
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Должность" />
            </Field>
            <Field label="Отдел">
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Департамент…" />
            </Field>
          </div>

          <div className="mt-5">
            <span className="label">Цвет аватара</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-150",
                    color === c ? "ring-2 ring-offset-2 ring-ink-800 scale-110" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Цвет ${c}`}
                />
              ))}
              <span className="ml-2 flex items-center gap-1.5 text-[12px] text-ink-400">
                <Palette size={13} />
                Влияет на аватар и акценты ваших сообщений
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button loading={saving} onClick={() => void save()}>
              Сохранить изменения
            </Button>
          </div>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-5 sm:p-6">
        <SectionTitle>Безопасность</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Новый пароль" hint="Минимум 8 символов">
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Повторите пароль">
            <Input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} placeholder="••••••••" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" loading={passBusy} onClick={() => void doPass()}>
            <KeyRound size={15} />
            Сменить пароль
          </Button>
        </div>
        {isDemo && (
          <p className="mt-3 text-[12px] text-ink-400">
            В Demo Mode пароли хранятся локально в вашем браузере. Стандартный демо-пароль:{" "}
            <span className="font-mono font-semibold text-ink-600">{DEMO_PASSWORD}</span>
          </p>
        )}
      </Card>

      {/* About / demo mode */}
      <Card className="p-5 sm:p-6">
        <SectionTitle>О системе</SectionTitle>
        <div className="space-y-3 text-[13px] text-ink-600">
          <div className="flex items-start gap-3">
            <Info size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <p>
              <b className="text-ink-900">MODUS VOICE</b> — внутренняя платформа управления идеями, проблемами и
              инициативами сотрудников. Полный жизненный цикл: регистрация → назначение → рассмотрение → решение →
              результат.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Radio size={16} className={cn("mt-0.5 shrink-0", isDemo ? "text-warn-600" : "text-good-600")} />
            <p>
              Режим хранения: <b className="text-ink-900">{isDemo ? "Demo Mode (локально в браузере)" : "Supabase (серверная БД PostgreSQL)"}</b>
              {isDemo
                ? ". Все действия работают полноценно, данные сохраняются после перезагрузки страницы. Для серверного хранения подключите Supabase (см. README.md)."
                : ". Данные обслуживаются серверной базой с раздельными правами доступа (RLS)."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Monitor size={16} className="mt-0.5 shrink-0 text-ink-400" />
            <p>
              Интерфейс адаптирован для компьютеров, планшетов и смартфонов —{" "}
              <span className="inline-flex items-center gap-1">
                <Monitor size={12} />
                <Smartphone size={12} />
              </span>{" "}
              откройте систему на любом устройстве.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/60 px-3.5 py-2.5">
            <Database size={15} className="shrink-0 text-ink-400" />
            <span className="text-[12.5px]">
              Аккаунт создан {formatDate(user.createdAt)} · всего обращений в системе:{" "}
              <b>{snapshot.publicStats.total}</b>
            </span>
          </div>
        </div>
      </Card>

      {/* Session actions */}
      <Card className="p-5 sm:p-6">
        <SectionTitle>Сессия</SectionTitle>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          {isDemo && (
            <Button
              variant="secondary"
              onClick={() => {
                if (window.confirm("Сбросить демо-данные? Все ваши изменения будут удалены, набор данных вернётся к исходному демо-состоянию.")) {
                  void resetDemo();
                }
              }}
            >
              <RotateCcw size={15} />
              Сбросить демо-данные
            </Button>
          )}
          <Button
            variant="danger"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            <LogOut size={15} />
            Выйти из системы
          </Button>
        </div>
      </Card>
    </div>
  );
}
