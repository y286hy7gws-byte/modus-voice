"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  AuthedUser,
  Category,
  Comment,
  NotificationItem,
  NewRequestPayload,
  Request,
  Role,
  Snapshot,
} from "../types";
import type { Backend, NotificationDraft, RequestPatch } from "../backend";
import { computePublicStats } from "../seed";

/**
 * SupabaseBackend — полноценный серверный режим.
 *
 * Активируется автоматически, если заданы переменные окружения:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Разграничение доступа обеспечивается RLS-политиками (см. supabase/migrations.sql).
 * Если переменные не заданы — приложение работает в Demo Mode на localStorage.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function mapRequest(r: Row): Request {
  return {
    id: r.request_code ?? r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    categoryId: r.category_id,
    priority: r.priority,
    status: r.status,
    authorId: r.author_id,
    isAnonymous: r.is_anonymous,
    assigneeId: r.assignee_id,
    possibleSolution: r.possible_solution,
    decision: r.decision,
    rejectionReason: r.rejection_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
    dueDate: r.due_date,
  };
}

function mapProfile(p: Row): AuthedUser {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    position: p.position,
    department: p.department,
    color: p.color,
    createdAt: p.created_at,
  };
}

export class SupabaseBackend implements Backend {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  async getSession(): Promise<AuthedUser | null> {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) return null;
    const { data: prof } = await this.sb.from("profiles").select("*").eq("id", data.user.id).single();
    return prof ? mapProfile(prof) : null;
  }

  async signIn(email: string, password: string): Promise<AuthedUser> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const u = await this.getSession();
    if (!u) throw new Error("Профиль пользователя не найден в системе");
    return u;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  async loadSnapshot(userId: string, role: Role): Promise<Snapshot> {
    const [reqRes, profRes, catRes, nRes, statsRes, routRes] = await Promise.all([
      this.sb.from("requests").select("*").order("created_at", { ascending: false }),
      this.sb.from("profiles").select("*"),
      this.sb.from("categories").select("*").order("sort_order"),
      this.sb.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      this.sb.rpc("public_stats_v1"),
      this.sb.from("routing_rules").select("*"),
    ]);
    if (reqRes.error) throw reqRes.error;
    if (profRes.error) throw profRes.error;
    if (catRes.error) throw catRes.error;
    if (nRes.error) throw nRes.error;

    const requests: Request[] = (reqRes.data ?? []).map(mapRequest);
    const profiles: AuthedUser[] = (profRes.data ?? []).map(mapProfile);

    let comments: Comment[] = [];
    let history: Snapshot["history"] = [];
    let attachments: Snapshot["attachments"] = [];
    if (requests.length > 0) {
      const internalIds = (reqRes.data ?? []).map((r: Row) => r.internal_id);
      const [cRes, hRes, aRes] = await Promise.all([
        this.sb.from("comments").select("*").in("request_id", internalIds).order("created_at"),
        this.sb.from("status_history").select("*").in("request_id", internalIds).order("created_at"),
        this.sb.from("attachments").select("*").in("request_id", internalIds),
      ]);
      comments = (cRes.data ?? []).map((c: Row) => ({
        id: c.id,
        requestId: c.request_id,
        authorId: c.author_id,
        text: c.text,
        kind: c.kind,
        createdAt: c.created_at,
      }));
      history = (hRes.data ?? []).map((h: Row) => ({
        id: h.id,
        requestId: h.request_id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        changedById: h.changed_by,
        comment: h.comment,
        createdAt: h.created_at,
      }));
      attachments = (aRes.data ?? []).map((a: Row) => ({
        id: a.id,
        requestId: a.request_id,
        name: a.name,
        size: a.size,
        mime: a.mime,
        dataUrl: a.data_url,
        createdAt: a.created_at,
      }));
    }

    void role;
    const stats = statsRes.data;

    return {
      profiles,
      categories: (catRes.data ?? []).map((c: Row) => ({ id: c.id, name: c.name, active: c.active, system: c.is_system })),
      requests,
      comments,
      history,
      routing: (routRes.data ?? []).map((rr: Row) => ({ categoryId: rr.category_id, assigneeId: rr.assignee_id })),
      notifications: (nRes.data ?? []).map((n: Row) => ({
        id: n.id,
        userId: n.user_id,
        requestId: n.request_code,
        kind: n.kind,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.created_at,
      })),
      attachments,
      publicStats:
        stats && stats.length > 0
          ? {
              total: stats[0].total,
              implemented: stats[0].implemented,
              implementationRate: stats[0].implementation_rate,
              avgResolutionHours: stats[0].avg_resolution_hours,
            }
          : computePublicStats(requests),
    };
  }

  async createRequest(userId: string, payload: NewRequestPayload): Promise<Request> {
    void userId;
    const { data: userData } = await this.sb.auth.getUser();
    if (!userData.user) throw new Error("Требуется авторизация");
    const { data, error } = await this.sb
      .from("requests")
      .insert({
        title: payload.title,
        description: payload.description,
        type: payload.type,
        category_id: payload.categoryId,
        priority: payload.priority,
        possible_solution: payload.possibleSolution,
        is_anonymous: payload.isAnonymous,
        author_id: payload.isAnonymous ? null : userData.user.id,
        due_date: payload.dueDate,
        status: "NEW",
      })
      .select("*")
      .single();
    if (error) throw error;
    if (payload.attachments.length > 0) {
      await this.sb.from("attachments").insert(
        payload.attachments.slice(0, 5).map((a) => ({
          request_id: data.internal_id,
          name: a.name,
          size: a.size,
          mime: a.mime,
          data_url: a.dataUrl,
        })),
      );
    }
    return mapRequest(data);
  }

  async updateRequest(
    userId: string,
    requestId: string,
    patch: RequestPatch,
    historyComment?: string | null,
  ): Promise<Request> {
    void userId;
    const dbPatch: Row = {};
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.assigneeId !== undefined) dbPatch.assignee_id = patch.assigneeId;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if (patch.decision !== undefined) dbPatch.decision = patch.decision;
    if (patch.rejectionReason !== undefined) dbPatch.rejection_reason = patch.rejectionReason;
    if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
    const { data, error } = await this.sb
      .from("requests")
      .update(dbPatch)
      .eq("request_code", requestId)
      .select("*")
      .single();
    if (error) throw error;
    if (patch.status && historyComment) {
      await this.sb.from("status_history").insert({
        request_id: data.internal_id,
        from_status: patch.status,
        to_status: patch.status,
        changed_by: userId,
        comment: historyComment,
      });
    }
    return mapRequest(data);
  }

  async addComment(userId: string, requestId: string, text: string, kind: Comment["kind"]): Promise<Comment> {
    const { data: r, error: lookupError } = await this.sb
      .from("requests")
      .select("internal_id")
      .eq("request_code", requestId)
      .single();
    if (lookupError || !r) throw lookupError ?? new Error("Обращение не найдено");
    const { data, error } = await this.sb
      .from("comments")
      .insert({ request_id: r.internal_id, author_id: userId, text, kind })
      .select("*")
      .single();
    if (error) throw error;
    return { id: data.id, requestId, authorId: userId, text, kind, createdAt: data.created_at };
  }

  async sendNotifications(items: NotificationDraft[]): Promise<void> {
    if (items.length === 0) return;
    const codes = [...new Set(items.map((i) => i.requestId).filter(Boolean))] as string[];
    const internalMap: Record<string, string> = {};
    if (codes.length > 0) {
      const { data } = await this.sb.from("requests").select("internal_id, request_code").in("request_code", codes);
      for (const row of data ?? []) internalMap[row.request_code] = row.internal_id;
    }
    await this.sb.from("notifications").insert(
      items.map((i) => ({
        user_id: i.userId,
        request_id: i.requestId ? internalMap[i.requestId] ?? null : null,
        kind: i.kind,
        title: i.title,
        body: i.body,
      })),
    );
  }

  async markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
    void userId;
    if (ids && ids.length > 0) {
      await this.sb.from("notifications").update({ read: true }).in("id", ids);
    } else {
      await this.sb.from("notifications").update({ read: true }).eq("read", false);
    }
  }

  async updateProfile(
    userId: string,
    patch: Partial<Pick<AuthedUser, "name" | "position" | "department" | "color">>,
  ): Promise<AuthedUser> {
    const { data, error } = await this.sb
      .from("profiles")
      .update({ name: patch.name, position: patch.position, department: patch.department, color: patch.color })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return mapProfile(data);
  }

  async changePassword(userId: string, nextPassword: string): Promise<void> {
    void userId;
    const { error } = await this.sb.auth.updateUser({ password: nextPassword });
    if (error) throw error;
  }

  async createUser(
    actorId: string,
    payload: { name: string; email: string; role: Role; position: string; department: string; password?: string },
  ): Promise<AuthedUser> {
    void actorId;
    const { data, error } = await this.sb.rpc("create_user_v1", {
      p_name: payload.name,
      p_email: payload.email,
      p_role: payload.role,
      p_position: payload.position,
      p_department: payload.department,
    });
    if (error) throw error;
    return mapProfile(data);
  }

  async updateUser(
    actorId: string,
    userId: string,
    patch: Partial<Pick<AuthedUser, "name" | "role" | "position" | "department">>,
  ): Promise<AuthedUser> {
    void actorId;
    const { data, error } = await this.sb.from("profiles").update(patch).eq("id", userId).select("*").single();
    if (error) throw error;
    return mapProfile(data);
  }

  async deleteUser(actorId: string, userId: string): Promise<void> {
    void actorId;
    const { error } = await this.sb.rpc("delete_user_v1", { p_user_id: userId });
    if (error) throw error;
  }

  async addCategory(actorId: string, name: string): Promise<Category> {
    void actorId;
    const { data, error } = await this.sb.from("categories").insert({ name }).select("*").single();
    if (error) throw error;
    return { id: data.id, name: data.name, active: data.active, system: data.is_system };
  }

  async setRoutingRule(actorId: string, categoryId: string, assigneeId: string | null): Promise<void> {
    void actorId;
    const { error } = await this.sb
      .from("routing_rules")
      .upsert({ category_id: categoryId, assignee_id: assigneeId }, { onConflict: "category_id" });
    if (error) throw error;
  }

  async updateCategory(
    actorId: string,
    categoryId: string,
    patch: Partial<Pick<Category, "name" | "active">>,
  ): Promise<Category> {
    void actorId;
    const { data, error } = await this.sb
      .from("categories")
      .update({ name: patch.name, active: patch.active })
      .eq("id", categoryId)
      .select("*")
      .single();
    if (error) throw error;
    return { id: data.id, name: data.name, active: data.active };
  }
}
