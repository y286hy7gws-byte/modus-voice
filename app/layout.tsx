import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { ToastHost } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "MODUS VOICE — платформа обратной связи сотрудников",
  description:
    "Внутренняя платформа управления идеями, проблемами и инициативами сотрудников ГК «Модус Трейд». Ни одна идея не теряется и не остаётся без ответа.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#17181d" },
  ],
};

/**
 * Ставит класс `dark` на <html> до первой отрисовки (без мигания):
 * сохранённый выбор пользователя → иначе системная схема.
 * Ключ должен совпадать с THEME_STORAGE_KEY в components/theme-toggle.tsx.
 */
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("modus-voice:theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AppProvider>{children}</AppProvider>
        <ToastHost />
      </body>
    </html>
  );
}
