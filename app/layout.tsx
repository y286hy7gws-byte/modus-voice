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
  themeColor: "#17181d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppProvider>{children}</AppProvider>
        <ToastHost />
      </body>
    </html>
  );
}
