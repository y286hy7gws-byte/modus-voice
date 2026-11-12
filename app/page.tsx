"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2, Radio, CheckCircle2, MessageSquareText, BellRing, BarChart3 } from "lucide-react";
import { useApp } from "@/lib/store";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES } from "@/lib/constants";
import { homePathFor } from "@/lib/rights";
import { Button, Input, Field } from "@/components/ui/kit";
import { toast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: CheckCircle2, text: "Каждое обращение получает ID, ответственного и срок" },
  { icon: MessageSquareText, text: "Диалог сотрудника и ответственного внутри обращения" },
  { icon: BellRing, text: "Автор видит каждый шаг: от регистрации до решения" },
  { icon: BarChart3, text: "Реальная аналитика: динамика, категории, результативность" },
];

export default function LoginPage() {
  const { booted, user, signIn, backend } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booted && user) router.replace(homePathFor(user));
  }, [booted, user, router]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    await doSignIn(email, password);
  };

  const doSignIn = async (em: string, pw: string) => {
    setError(null);
    setBusy(true);
    try {
      const u = await signIn(em, pw);
      router.replace(homePathFor(u));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
      setBusy(false);
    }
  };

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    void doSignIn(demoEmail, DEMO_PASSWORD);
  };

  const isDemo = backend.mode === "demo";

  return (
    <div className="relative flex min-h-screen bg-page">
      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-night p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px circle at 15% 0%, rgba(99,102,241,0.28), transparent 55%), radial-gradient(900px circle at 90% 110%, rgba(25,118,210,0.25), transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-[13px] font-extrabold text-white shadow-[0_4px_16px_rgb(79_70_229/0.4)]">
              MV
            </span>
            <div>
              <div className="text-[15px] font-extrabold tracking-[0.14em] text-white">MODUS VOICE</div>
              <div className="text-[11px] font-medium tracking-[0.08em] text-white/50">ГК «МОДУС ТРЕЙД»</div>
            </div>
          </div>

          <h1 className="mt-16 max-w-md text-[34px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white xl:text-[38px]">
            Ни одна идея сотрудника не должна потеряться
          </h1>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-white/70">
            Платформа полного жизненного цикла обращений: от идеи сотрудника до зафиксированного решения компании.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 anim-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                  <f.icon size={16} />
                </span>
                <span className="text-[13.5px] text-white/70">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11.5px] text-white/38">
          Pavlodar Hub × ГК «Модус Трейд» · Hackathon MVP · Внутренний контур компании
        </div>
      </div>

      {/* Auth form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px] anim-fade-up">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[12px] font-extrabold text-white">
                MV
              </span>
              <span className="text-[14px] font-extrabold tracking-[0.12em] text-ink-900">MODUS VOICE</span>
            </div>
          </div>

          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">Вход в систему</h2>
          <p className="mt-1 text-[13.5px] text-ink-500">
            Используйте корпоративную учётную запись для доступа к платформе.
          </p>

          {isDemo && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warn-100 bg-warn-50 px-3.5 py-3">
              <Radio size={15} className="mt-0.5 shrink-0 text-warn-600" />
              <p className="text-[12.5px] leading-relaxed text-warn-600">
                <b>Запущен Demo Mode.</b> Данные сохраняются локально в браузере. Пройдите в систему под одной из
                демонстрационных ролей ниже.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label="Корпоративный e-mail">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  type="email"
                  autoComplete="email"
                  className="field-lg pl-9.5"
                  placeholder="name@modus.demo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Пароль">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="field-lg pl-9.5 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-xl border border-bad-100 bg-bad-50 px-3.5 py-2.5 text-[12.5px] font-medium text-bad-600">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {busy ? "Входим…" : "Войти в систему"}
              {!busy && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-200" />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">Демо-доступы</span>
              <span className="h-px flex-1 bg-ink-200" />
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  disabled={busy}
                  onClick={() => quickLogin(a.email)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-surface px-3.5 py-3 text-left transition-all duration-150 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-card disabled:opacity-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
                    {a.role === "ADMIN" ? <ShieldCheck size={15} /> : a.role === "MANAGER" ? <Lock size={15} /> : <Mail size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink-900">{ROLES[a.role].label}</span>
                    <span className="block truncate text-[11.5px] text-ink-400">{a.email}</span>
                  </span>
                  {busy ? <Loader2 size={15} className="animate-spin text-ink-400" /> : <ArrowRight size={15} className="text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11.5px] text-ink-400">
              Пароль всех демо-аккаунтов: <span className="font-mono font-semibold text-ink-600">{DEMO_PASSWORD}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
