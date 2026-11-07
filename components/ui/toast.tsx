"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastKind = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

let counter = 0;
let push: ((t: ToastItem) => void) | null = null;

export function toast(kind: ToastKind, title: string, body?: string) {
  push?.({ id: ++counter, kind, title, body });
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const ACCENTS: Record<ToastKind, string> = {
  success: "text-good-600",
  info: "text-info-600",
  warning: "text-warn-600",
  error: "text-bad-600",
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = ICONS[item.kind];
  return (
    <div
      role="status"
      className={cn(
        "anim-slide-in pointer-events-auto flex w-[min(92vw,380px)] items-start gap-3 rounded-xl border border-ink-100 bg-surface p-3.5 shadow-pop",
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ACCENTS[item.kind])} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink-900">{item.title}</div>
        {item.body && <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{item.body}</div>}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        aria-label="Закрыть уведомление"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    push = (t) => {
      setItems((prev) => [...prev.slice(-4), t]);
      if (typeof window !== "undefined") {
        window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 5200);
      }
    };
    return () => {
      push = null;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onClose={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} />
      ))}
    </div>,
    document.body,
  );
}
