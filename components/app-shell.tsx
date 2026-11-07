"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Inbox,
  BarChart3,
  Bell,
  ShieldCheck,
  Files,
  Users,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Radio,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { Avatar } from "@/components/ui/kit";
import { Menu, MenuItem, MenuItemDivider, Button } from "@/components/ui/kit";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
  badge?: "unread" | "mineActionable";
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function navFor(role: Role): NavSection[] {
  const sections: NavSection[] = [];

  const home = role === "ADMIN" ? "/admin" : role === "MANAGER" ? "/manager" : "/dashboard";
  const homeLabel = role === "ADMIN" ? "Панель администратора" : role === "MANAGER" ? "Панель ответственного" : "Дашборд";
  const manageItems: NavItem[] =
    role === "EMPLOYEE"
      ? []
      : [
          { href: home, label: homeLabel, icon: <ShieldCheck size={17} />, roles: [role] },
        ];

  sections.push({
    title: "Обзор",
    items: [
      ...manageItems,
      { href: "/analytics", label: "Аналитика", icon: <BarChart3 size={17} />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    ],
  });

  sections.push({
    title: "Обращения",
    items: [
      { href: "/requests/new", label: "Создать обращение", icon: <PlusCircle size={17} />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"], exact: true },
      { href: "/my-requests", label: "Мои обращения", icon: <Inbox size={17} />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
      { href: "/requests", label: "Все обращения", icon: <Files size={17} />, roles: ["MANAGER", "ADMIN"] },
    ],
  });

  sections.push({
    title: "Управление",
    items: [
      { href: "/notifications", label: "Уведомления", icon: <Bell size={17} />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"], badge: "unread" },
      ...(role === "ADMIN"
        ? [{ href: "/users", label: "Пользователи", icon: <Users size={17} />, roles: [role] as Role[] }]
        : []),
      { href: "/settings", label: "Настройки профиля", icon: <Settings size={17} />, roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    ],
  });

  return sections;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 font-extrabold text-white shadow-[0_2px_8px_rgb(79_70_229/0.35)]" style={{ fontSize: 11 }}>
        MV
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-extrabold tracking-[0.14em] text-white">MODUS VOICE</span>
        <span className="block text-[10px] font-medium tracking-[0.08em] text-ink-300/70">
          ГОЛОС КАЖДОГО СОТРУДНИКА
        </span>
      </span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, unreadCount } = useApp();
  const pathname = usePathname();
  if (!user) return null;
  const sections = navFor(user.role).map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(user.role)) }));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-3 py-4">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-300/50">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")) || (item.href !== "/" && !item.exact && pathname.startsWith(item.href));
                const showBadge = item.badge === "unread" && unreadCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      active
                        ? "bg-white/10 text-white"
                        : "text-ink-300/80 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
                    )}
                    <span className={cn("transition-colors", active ? "text-brand-300" : "text-ink-300/60 group-hover:text-brand-300")}>
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <span className="num flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10.5px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
        >
          <Avatar name={user.name} color={user.color} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white">{user.name}</span>
            <span className="block truncate text-[11px] text-ink-300/60">{ROLES[user.role].label}</span>
          </span>
          <ChevronRight size={15} className="text-ink-300/50" />
        </Link>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const { user, snapshot, unreadCount, markRead, nameOf } = useApp();
  const router = useRouter();
  if (!user) return null;
  const recent = (snapshot?.notifications ?? []).slice(0, 5);

  return (
    <Menu
      width="w-[340px]"
      trigger={
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          aria-label="Уведомления"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="num absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-bad-500 px-0.5 text-[9.5px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      }
    >
      {(close) => (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-ink-100 px-4 pb-2 pt-1.5">
            <span className="text-[13px] font-bold text-ink-900">Уведомления</span>
            {unreadCount > 0 && (
              <button
                className="text-[11.5px] font-semibold text-brand-600 hover:underline"
                onClick={() => void markRead()}
              >
                Отметить все
              </button>
            )}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {recent.length === 0 && (
              <div className="px-4 py-6 text-center text-[12.5px] text-ink-400">Пока нет уведомлений</div>
            )}
            {recent.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  void markRead([n.id]);
                  close();
                  if (n.requestId) router.push(`/requests/${n.requestId}`);
                  else router.push("/notifications");
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-ink-50 px-4 py-2.5 text-left transition-colors hover:bg-ink-50",
                  !n.read && "bg-brand-50/40",
                )}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-ink-900">{n.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-ink-500">{n.body}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="p-2">
            <Link
              href="/notifications"
              onClick={close}
              className="block rounded-lg px-3 py-2 text-center text-[12.5px] font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Все уведомления
            </Link>
          </div>
        </div>
      )}
    </Menu>
  );
}

function UserMenu() {
  const { user, signOut } = useApp();
  const router = useRouter();
  if (!user) return null;
  return (
    <Menu
      trigger={
        <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-ink-100">
          <Avatar name={user.name} color={user.color} size={30} />
          <span className="hidden text-[13px] font-semibold text-ink-800 lg:block">{user.name.split(" ")[0]}</span>
        </button>
      }
    >
      {(close) => (
        <>
          <div className="px-3.5 pb-2 pt-1">
            <div className="text-[13px] font-bold text-ink-900">{user.name}</div>
            <div className="truncate text-[11.5px] text-ink-400">{user.email}</div>
            <div className="mt-1 inline-flex rounded-md bg-ink-100 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-600">
              {ROLES[user.role].label}
            </div>
          </div>
          <MenuItemDivider />
          <MenuItem
            icon={<Settings size={15} />}
            onClick={() => {
              close();
              router.push("/settings");
            }}
          >
            Настройки профиля
          </MenuItem>
          <MenuItemDivider />
          <MenuItem
            icon={<LogOut size={15} />}
            danger
            onClick={() => {
              close();
              void signOut().then(() => router.push("/"));
            }}
          >
            Выйти
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, backend, booted } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (booted && !user) router.replace("/");
  }, [booted, user, router]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  if (!booted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-3">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          <span className="text-[12.5px] font-medium text-ink-400">Загрузка MODUS VOICE…</span>
        </div>
      </div>
    );
  }

  const isDemo = backend.mode === "demo";

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] bg-ink-900 lg:block xl:w-[264px]">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="anim-fade absolute inset-0 bg-ink-950/50" onClick={() => setDrawerOpen(false)} />
          <aside className="anim-fade absolute inset-y-0 left-0 w-[280px] bg-ink-900 shadow-pop">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-ink-300 hover:bg-white/10"
              aria-label="Закрыть меню"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px] xl:pl-[264px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-100 bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 lg:hidden"
            aria-label="Открыть меню"
          >
            <MenuIcon size={19} />
          </button>

          {isDemo ? (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-warn-100 bg-warn-50 px-2.5 py-1 text-[11px] font-bold text-warn-600 sm:inline-flex"
              title="Данные хранятся локально в браузере. Для серверного режима подключите Supabase (см. README)"
            >
              <Radio size={12} />
              DEMO MODE
            </span>
          ) : (
            <span className="hidden items-center gap-1.5 rounded-full border border-good-100 bg-good-50 px-2.5 py-1 text-[11px] font-bold text-good-700 sm:inline-flex">
              <Radio size={12} />
              SUPABASE
            </span>
          )}

          <div className="flex-1" />

          <NotificationsMenu />
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { initials };
