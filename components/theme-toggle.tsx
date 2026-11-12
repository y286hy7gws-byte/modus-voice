"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_STORAGE_KEY = "modus-voice:theme";

/**
 * Переключатель тёмной/светлой темы.
 * Состояние живёт в классе `dark` на <html> (ставится до первой отрисовки
 * инлайн-скриптом в layout.tsx), поэтому иконки меняются чистым CSS —
 * без состояния React и рассинхрона гидратации.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    const dark = root.classList.contains("dark");
    const next = dark ? "light" : "dark";
    root.classList.toggle("dark", !dark);
    void root.offsetHeight; // принудительный reflow, чтобы палитра применилась без переходов
    window.setTimeout(() => root.classList.remove("theme-switching"), 120);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* приватный режим — тема просто не сохранится */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-800",
        className,
      )}
      aria-label="Переключить тёмную или светлую тему"
      title="Тема оформления"
    >
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  );
}
