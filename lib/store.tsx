"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthedUser,
  Category,
  Comment,
  NewRequestPayload,
  Request,
  Role,
  Snapshot,
} from "./types";
import type { RequestPatch, NotificationDraft } from "./backend";
import { DemoBackend } from "./backends/demo";
import { SupabaseBackend } from "./backends/supabase";
import { toast } from "@/components/ui/toast";

function selectBackend(): Backend {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) return new SupabaseBackend(url, key);
  return new DemoBackend();
}

type Backend = import("./backend").Backend;

interface AppState {
  booted: boolean;
  user: AuthedUser | null;
  snapshot: Snapshot | null;
  backend: Backend;
  unreadCount: number;
  signIn: (email: string, password: string) => Promise<AuthedUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  createRequest: (payload: NewRequestPayload) => Promise<Request>;
  addComment: (requestId: string, text: string, kind?: Comment["kind"], silent?: boolean) => Promise<void>;
  changeStatus: (request: Request, to: Request["status"], historyComment: string | null) => Promise<boolean>;
  assign: (request: Request, assigneeId: string | null) => Promise<boolean>;
  setPriority: (request: Request, priority: Request["priority"]) => Promise<boolean>;
  setDueDate: (request: Request, dueDate: string | null) => Promise<boolean>;
  saveDecision: (
    request: Request,
    status: Request["status"],
    text: string,
  ) => Promise<boolean>;
  markRead: (ids?: string[]) => Promise<void>;
  updateProfile: (patch: Partial<Pick<AuthedUser, "name" | "position" | "department" | "color">>) => Promise<boolean>;
  changePassword: (next: string) => Promise<boolean>;
  createUser: (payload: { name: string; email: string; role: Role; position: string; department: string; password?: string }) => Promise<boolean>;
  updateUser: (userId: string, patch: Partial<Pick<AuthedUser, "name" | "role" | "position" | "department">>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  addCategory: (name: string) => Promise<boolean>;
  updateCategory: (categoryId: string, patch: Partial<Pick<Category, "name" | "active">>) => Promise<boolean>;
  resetDemo: () => Promise<void>;
  nameOf: (userId: string | null) => string;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

function statusChangeKind(to: Request["status"]): NotificationDraft["kind"] {
  if (to === "IMPLEMENTED") return "IMPLEMENTED";
  if (to === "APPROVED" || to === "REJECTED") return "DECISION";
  if (to === "NEEDS_INFO") return "INFO_REQUESTED";
  return "STATUS_CHANGED";
}

const STATUS_PHRASE: Record<Request["status"], string> = {
  NEW: "новое",
  IN_REVIEW: "на рассмотрении",
  NEEDS_INFO: "требуется дополнительная информация",
  APPROVED: "одобрено, готовится к реализации",
  REJECTED: "отклонено",
  IN_PROGRESS: "в работе",
  IMPLEMENTED: "реализовано",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend] = useState<AppState["backend"]>(selectBackend);
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const bootedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await backend.loadSnapshot(user.id, user.role);
      setSnapshot(snap);
    } catch (e) {
      console.error(e);
      toast("error", "Ошибка загрузки данных", e instanceof Error ? e.message : "Попробуйте обновить страницу");
    }
  }, [backend, user]);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      let u: AuthedUser | null = null;
      try {
        u = await backend.getSession();
      } catch (e) {
        console.error(e);
      }
      if (u) {
        setUser(u);
        try {
          setSnapshot(await backend.loadSnapshot(u.id, u.role));
        } catch (e) {
          console.error(e);
        }
      }
      setBooted(true);
    })();
  }, [backend]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const u = await backend.signIn(email, password);
      setUser(u);
      try {
        setSnapshot(await backend.loadSnapshot(u.id, u.role));
      } catch (e) {
        console.error(e);
      }
      return u;
    },
    [backend],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setUser(null);
    setSnapshot(null);
  }, [backend]);

  /** Notifications are stored through the backend so both demo and supabase behave identically. */
  const notify = useCallback(
    async (items: NotificationDraft[]) => {
      const filtered = items.filter((it, i) => it.userId && items.findIndex((x) => x.userId === it.userId) === i);
      if (filtered.length === 0) return;
      try {
        await backend.sendNotifications(filtered);
        setSnapshot((prev) =>
          prev && user
            ? {
                ...prev,
                notifications: [
                  ...filtered
                    .filter((it) => it.userId === user.id)
                    .map((it, i) => ({
                      id: `local_${Date.now()}_${i}`,
                      userId: it.userId,
                      requestId: it.requestId,
                      kind: it.kind,
                      title: it.title,
                      body: it.body,
                      read: false,
                      createdAt: new Date().toISOString(),
                    })),
                  ...prev.notifications,
                ],
              }
            : prev,
        );
      } catch (e) {
        console.error("notify failed", e);
      }
    },
    [backend, user],
  );

  const withSnap = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Что-то пошло не так";
        toast("error", "Действие не выполнено", msg);
        throw e;
      }
    },
    [refresh],
  );

  const createRequest = useCallback(
    async (payload: NewRequestPayload) => {
      if (!user) throw new Error("Требуется авторизация");
      const req = await backend.createRequest(user.id, payload);
      const admins = snapshot?.profiles.filter((p) => p.role === "ADMIN").map((p) => p.id) ?? [];
      await notify([
        {
          userId: user.id,
          requestId: req.id,
          kind: "REGISTERED",
          title: `Обращение ${req.id} зарегистрировано`,
          body: "Обращение получено и передано в систему. Отслеживать статус можно в разделе «Мои обращения».",
        },
        ...admins
          .filter((id) => id !== user.id)
          .map((id) => ({
            userId: id,
            requestId: req.id,
            kind: "REGISTERED" as const,
            title: `Новое обращение ${req.id}`,
            body: `${req.title.slice(0, 90)}`,
          })),
      ]);
      await refresh();
      return req;
    },
    [backend, user, snapshot, notify, refresh],
  );

  const addComment = useCallback(
    async (requestId: string, text: string, kind: Comment["kind"] = "message", silent?: boolean) => {
      if (!user || !snapshot) throw new Error("Требуется авторизация");
      const req = snapshot.requests.find((r) => r.id === requestId);
      await withSnap(async () => {
        await backend.addComment(user.id, requestId, text, kind);
        if (req) {
          const actorName = user.name;
          const recipients = new Set<string>();
          if (req.authorId && (!req.isAnonymous || req.authorId === user.id)) recipients.add(req.authorId);
          if (req.assigneeId) recipients.add(req.assigneeId);
          recipients.delete(user.id);
          await notify(
            [...recipients].map((id) => ({
              userId: id,
              requestId,
              kind: "COMMENT" as const,
              title: `Новый комментарий ${requestId}`,
              body: `${actorName}: ${text.slice(0, 90)}`,
            })),
          );
        }
      });
      if (!silent) toast("success", "Комментарий отправлен");
    },
    [backend, user, snapshot, withSnap, notify],
  );

  const changeStatus = useCallback(
    async (request: Request, to: Request["status"], historyComment: string | null) => {
      if (!user) throw new Error("Требуется авторизация");
      const patch: RequestPatch = { status: to };
      let ok = false;
      await withSnap(async () => {
        await backend.updateRequest(user.id, request.id, patch, historyComment);
        ok = true;
        const recipients = new Set<string>();
        if (request.authorId && request.authorId !== user.id) recipients.add(request.authorId);
        if (request.assigneeId && request.assigneeId !== user.id) recipients.add(request.assigneeId);
        const kind = statusChangeKind(to);
        await notify(
          [...recipients].map((id) => ({
            userId: id,
            requestId: request.id,
            kind,
            title: `${request.id}: ${STATUS_PHRASE[to]}`,
            body: historyComment?.slice(0, 110) ?? request.title.slice(0, 110),
          })),
        );
      });
      if (ok) toast("success", "Статус обновлён", `${request.id} — ${STATUS_PHRASE[to]}`);
      return ok;
    },
    [backend, user, withSnap, notify],
  );

  const assign = useCallback(
    async (request: Request, assigneeId: string | null) => {
      if (!user) throw new Error("Требуется авторизация");
      let ok = false;
      await withSnap(async () => {
        await backend.updateRequest(user.id, request.id, { assigneeId }, null);
        ok = true;
        const items: NotificationDraft[] = [];
        const managers = snapshot?.profiles.filter((p) => p.role === "MANAGER") ?? [];
        const assigneeName =
          managers.find((p) => p.id === assigneeId)?.name ?? "Ответственный";
        if (assigneeId && assigneeId !== user.id) {
          items.push({
            userId: assigneeId,
            requestId: request.id,
            kind: "ASSIGNED",
            title: `Новое назначение ${request.id}`,
            body: `${request.title.slice(0, 90)}`,
          });
        }
        if (request.authorId && request.authorId !== user.id && request.authorId !== assigneeId) {
          items.push({
            userId: request.authorId,
            requestId: request.id,
            kind: "ASSIGNED",
            title: `Назначен ответственный ${request.id}`,
            body: assigneeId ? `${assigneeName} назначен ответственным по вашему обращению` : "Ответственный снят с обращения",
          });
        }
        await notify(items);
      });
      if (ok)
        toast(
          "success",
          assigneeId ? "Ответственный назначен" : "Ответственный снят",
          `${request.id}`,
        );
      return ok;
    },
    [backend, user, snapshot, withSnap, notify],
  );

  const setPriority = useCallback(
    async (request: Request, priority: Request["priority"]) => {
      if (!user) throw new Error("Требуется авторизация");
      let ok = false;
      await withSnap(async () => {
        await backend.updateRequest(user.id, request.id, { priority }, null);
        ok = true;
      });
      if (ok) toast("success", "Приоритет обновлён", request.id);
      return ok;
    },
    [backend, user, withSnap],
  );

  const setDueDate = useCallback(
    async (request: Request, dueDate: string | null) => {
      if (!user) throw new Error("Требуется авторизация");
      let ok = false;
      await withSnap(async () => {
        await backend.updateRequest(user.id, request.id, { dueDate }, null);
        ok = true;
      });
      if (ok) toast("success", "Срок обновлён", request.id);
      return ok;
    },
    [backend, user, withSnap],
  );

  const saveDecision = useCallback(
    async (request: Request, status: Request["status"], text: string) => {
      if (!user) throw new Error("Требуется авторизация");
      const patch: RequestPatch = { status };
      if (status === "IMPLEMENTED") patch.decision = text;
      if (status === "REJECTED") patch.rejectionReason = text;
      if (status === "APPROVED") patch.decision = text;
      let ok = false;
      await withSnap(async () => {
        await backend.updateRequest(user.id, request.id, patch, text);
        ok = true;
        const recipients = new Set<string>();
        if (request.authorId && request.authorId !== user.id) recipients.add(request.authorId);
        if (request.assigneeId && request.assigneeId !== user.id) recipients.add(request.assigneeId);
        const kind = statusChangeKind(status);
        const label =
          status === "IMPLEMENTED" ? "реализовано" : status === "REJECTED" ? "отклонено" : "одобрено";
        await notify(
          [...recipients].map((id) => ({
            userId: id,
            requestId: request.id,
            kind,
            title: `${request.id} ${label}`,
            body: text.slice(0, 110),
          })),
        );
      });
      if (ok) toast("success", "Решение зафиксировано", `${request.id} — ${STATUS_PHRASE[status]}`);
      return ok;
    },
    [backend, user, withSnap, notify],
  );

  const markRead = useCallback(
    async (ids?: string[]) => {
      if (!user) return;
      await backend.markNotificationsRead(user.id, ids);
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) =>
                !n.read && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n,
              ),
            }
          : prev,
      );
    },
    [backend, user],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<AuthedUser, "name" | "position" | "department" | "color">>) => {
      if (!user) return false;
      try {
        const updated = await backend.updateProfile(user.id, patch);
        setUser(updated);
        toast("success", "Профиль сохранён");
        await refresh();
        return true;
      } catch (e) {
        toast("error", "Не удалось сохранить профиль", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user, refresh],
  );

  const changePassword = useCallback(
    async (next: string) => {
      if (!user) return false;
      try {
        await backend.changePassword(user.id, next);
        toast("success", "Пароль изменён");
        return true;
      } catch (e) {
        toast("error", "Не удалось изменить пароль", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user],
  );

  const createUser = useCallback(
    async (payload: { name: string; email: string; role: Role; position: string; department: string; password?: string }) => {
      if (!user) return false;
      try {
        await backend.createUser(user.id, payload);
        toast("success", "Пользователь создан", payload.name);
        await refresh();
        return true;
      } catch (e) {
        toast("error", "Не удалось создать пользователя", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user, refresh],
  );

  const updateUser = useCallback(
    async (userId: string, patch: Partial<Pick<AuthedUser, "name" | "role" | "position" | "department">>) => {
      if (!user) return false;
      try {
        await backend.updateUser(user.id, userId, patch);
        if (userId === user.id) {
          setUser((u) => (u ? ({ ...u, ...patch } as AuthedUser) : u));
        }
        toast("success", "Изменения сохранены");
        await refresh();
        return true;
      } catch (e) {
        toast("error", "Не удалось сохранить", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user, refresh],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      if (!user) return false;
      try {
        await backend.deleteUser(user.id, userId);
        toast("success", "Пользователь удалён");
        await refresh();
        return true;
      } catch (e) {
        toast("error", "Не удалось удалить пользователя", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user, refresh],
  );

  const addCategory = useCallback(
    async (name: string) => {
      if (!user) return false;
      try {
        await backend.addCategory(user.id, name);
        toast("success", "Категория добавлена", name);
        await refresh();
        return true;
      } catch (e) {
        toast("error", "Не удалось добавить категорию", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user, refresh],
  );

  const updateCategory = useCallback(
    async (categoryId: string, patch: Partial<Pick<Category, "name" | "active">>) => {
      if (!user) return false;
      try {
        await backend.updateCategory(user.id, categoryId, patch);
        toast("success", "Категория обновлена");
        await refresh();
        return true;
      } catch (e) {
        toast("error", "Не удалось обновить категорию", e instanceof Error ? e.message : "");
        return false;
      }
    },
    [backend, user, refresh],
  );

  const resetDemo = useCallback(async () => {
    if (!backend.resetDemo) return;
    await backend.resetDemo();
    window.location.href = "/";
  }, [backend]);

  const unreadCount = useMemo(
    () => snapshot?.notifications.filter((n) => !n.read).length ?? 0,
    [snapshot],
  );

  const nameOf = useCallback(
    (userId: string | null) => {
      if (!userId) return "—";
      return snapshot?.profiles.find((p) => p.id === userId)?.name ?? "Пользователь";
    },
    [snapshot],
  );

  const value = useMemo<AppState>(
    () => ({
      booted,
      user,
      snapshot,
      backend,
      unreadCount,
      signIn,
      signOut,
      refresh,
      createRequest,
      addComment,
      changeStatus,
      assign,
      setPriority,
      setDueDate,
      saveDecision,
      markRead,
      updateProfile,
      changePassword,
      createUser,
      updateUser,
      deleteUser,
      addCategory,
      updateCategory,
      resetDemo,
      nameOf,
    }),
    [
      booted,
      user,
      snapshot,
      backend,
      unreadCount,
      signIn,
      signOut,
      refresh,
      createRequest,
      addComment,
      changeStatus,
      assign,
      setPriority,
      setDueDate,
      saveDecision,
      markRead,
      updateProfile,
      changePassword,
      createUser,
      updateUser,
      deleteUser,
      addCategory,
      updateCategory,
      resetDemo,
      nameOf,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
