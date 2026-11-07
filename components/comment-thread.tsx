"use client";

import { useState } from "react";
import { Send, Info } from "lucide-react";
import type { AuthedUser, Comment } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/constants";
import { Avatar, Button, Textarea } from "@/components/ui/kit";

const KIND_LABEL: Record<Comment["kind"], string> = {
  message: "",
  info_request: "Запрос информации",
  note: "Служебная заметка",
};

export function CommentThread({
  comments,
  user,
  nameOf,
  colorOf,
  roleOf,
  onSubmit,
  showInfoRequestButton,
  onInfoRequest,
}: {
  comments: Comment[];
  user: AuthedUser;
  nameOf: (id: string) => string;
  colorOf: (id: string) => string | undefined;
  roleOf: (id: string) => AuthedUser["role"] | undefined;
  onSubmit: (text: string) => Promise<boolean> | void;
  showInfoRequestButton?: boolean;
  onInfoRequest?: (text: string) => Promise<boolean> | void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const run = async (fn: (t: string) => Promise<boolean> | void) => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const ok = await Promise.resolve(fn(t));
      if (ok !== false) setText("");
    } finally {
      setSending(false);
    }
  };

  const send = () => run(onSubmit);

  const sorted = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div>
      <div className="space-y-4">
        {sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center">
            <p className="text-[13px] text-ink-400">
              Комментариев пока нет. Задайте вопрос или уточните детали — диалог сохраняется внутри обращения.
            </p>
          </div>
        )}
        {sorted.map((c) => {
          const mine = c.authorId === user.id;
          const author = nameOf(c.authorId);
          const role = roleOf(c.authorId);
          return (
            <div key={c.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
              <Avatar name={author} color={colorOf(c.authorId)} size={34} />
              <div className={cn("max-w-[86%] min-w-0", mine && "items-end text-right")}>
                <div
                  className={cn("flex flex-wrap items-center gap-2", mine && "sm:justify-end")}
                >
                  <span className="text-[12.5px] font-bold text-ink-900">{author}</span>
                  {role && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-px text-[10px] font-bold uppercase tracking-wide",
                        role === "ADMIN"
                          ? "bg-bad-50 text-bad-600"
                          : role === "MANAGER"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-ink-100 text-ink-600",
                      )}
                    >
                      {ROLES[role].label}
                    </span>
                  )}
                  <span className="num text-[11px] text-ink-400">{formatDateTime(c.createdAt)}</span>
                  {c.kind !== "message" && (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-md px-1.5 py-px text-[10px] font-bold uppercase tracking-wide",
                        c.kind === "info_request" ? "bg-warn-50 text-warn-600" : "bg-ink-100 text-ink-500",
                      )}
                    >
                      <Info size={10} />
                      {KIND_LABEL[c.kind]}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "mt-1.5 whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    mine
                      ? "rounded-tr-sm bg-brand-600 text-white"
                      : "rounded-tl-sm border border-ink-100 bg-ink-50 text-ink-800",
                  )}
                >
                  {c.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      <div className="mt-6 rounded-xl border border-ink-100 bg-surface p-3 shadow-card focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите комментарий…"
          rows={2}
          className="border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:border-0 focus:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send();
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink-100 pt-2">
          <span className="hidden text-[11.5px] text-ink-300 sm:block">Ctrl + Enter — отправить</span>
          <div className="flex items-center gap-2">
            {showInfoRequestButton && onInfoRequest && (
              <Button
                variant="secondary"
                size="sm"
                disabled={!text.trim() || sending}
                onClick={() => void run(onInfoRequest)}
              >
                <Info size={14} />
                Запросить информацию
              </Button>
            )}
            <Button size="sm" loading={sending} disabled={!text.trim()} onClick={() => void send()}>
              <Send size={14} />
              Отправить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
