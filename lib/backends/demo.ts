import type {
  AuthedUser,
  Category,
  Comment,
  NotificationItem,
  NewRequestPayload,
  Request,
  Role,
  RoutingRule,
  Snapshot,
} from "../types";
import { buildHistory, type Backend, type NotificationDraft, type RequestPatch } from "../backend";
import { buildSeed, computePublicStats } from "../seed";
import { SYSTEM_CATEGORIES } from "../constants";

interface DemoDb {
  profiles: Array<AuthedUser & { password: string }>;
  categories: Category[];
  requests: Request[];
  comments: Comment[];
  history: Snapshot["history"];
  notifications: NotificationItem[];
  attachments: Snapshot["attachments"];
  routing: RoutingRule[];
  nextSeq: number;
}

const DB_KEY = "modus-voice:db:v2";
const SESSION_KEY = "modus-voice:session:v1";

function freshDb(): DemoDb {
  const snap = buildSeed();
  return {
    profiles: snap.profiles as Array<AuthedUser & { password: string }>,
    categories: snap.categories,
    requests: snap.requests,
    comments: snap.comments,
    history: snap.history,
    notifications: snap.notifications,
    attachments: snap.attachments,
    routing: snap.routing,
    nextSeq: 21,
  };
}

function loadDb(): DemoDb {
  if (typeof window === "undefined") throw new Error("demo backend is client-only");
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb;
      if (parsed && Array.isArray(parsed.profiles) && Array.isArray(parsed.routing) && parsed.nextSeq) return parsed;
    }
  } catch {
    // corrupted storage — reseed
  }
  const db = freshDb();
  saveDb(db);
  return db;
}

function saveDb(db: DemoDb) {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("Modus Voice: не удалось сохранить демо-данные", e);
  }
}

function toAuthed(p: DemoDb["profiles"][number]): AuthedUser {
  const { password: _pw, ...rest } = p;
  return rest;
}

export class DemoBackend implements Backend {
  readonly mode = "demo" as const;
  private db: DemoDb | null = null;

  private get DB(): DemoDb {
    if (!this.db) this.db = loadDb();
    return this.db;
  }

  private persist() {
    saveDb(this.DB);
  }

  async getSession(): Promise<AuthedUser | null> {
    const id = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
    if (!id) return null;
    const p = this.DB.profiles.find((x) => x.id === id);
    return p ? toAuthed(p) : null;
  }

  async signIn(email: string, password: string): Promise<AuthedUser> {
    const p = this.DB.profiles.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password,
    );
    if (!p) throw new Error("Неверный e-mail или пароль");
    window.localStorage.setItem(SESSION_KEY, p.id);
    return toAuthed(p);
  }

  async signOut(): Promise<void> {
    window.localStorage.removeItem(SESSION_KEY);
  }

  private visibleRequests(userId: string, role: Role): Request[] {
    const all = this.DB.requests;
    if (role === "ADMIN") return all;
    return all.filter((r) => {
      if (r.authorId === userId) return true;
      if (role === "MANAGER" && r.assigneeId === userId) return true;
      return false;
    });
  }

  async loadSnapshot(userId: string, role: Role): Promise<Snapshot> {
    const db = this.DB;
    const visible = this.visibleRequests(userId, role);
    const visibleIds = new Set(visible.map((r) => r.id));
    return {
      profiles: db.profiles.map(toAuthed),
      categories: db.categories,
      requests: visible,
      comments: db.comments.filter((c) => visibleIds.has(c.requestId)),
      history: db.history.filter((h) => visibleIds.has(h.requestId)),
      notifications: db.notifications
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      attachments: db.attachments.filter((a) => visibleIds.has(a.requestId)),
      routing: db.routing,
      publicStats: computePublicStats(db.requests),
      publicStatusCounts: db.requests.reduce(
        (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
        {} as Partial<Record<Request["status"], number>>,
      ),
    };
  }

  async createRequest(userId: string, payload: NewRequestPayload): Promise<Request> {
    const db = this.DB;
    const seq = db.nextSeq;
    db.nextSeq = seq + 1;
    const now = new Date().toISOString();
    const req: Request = {
      id: `MV-${String(seq).padStart(4, "0")}`,
      title: payload.title.trim(),
      description: payload.description.trim(),
      type: payload.type,
      categoryId: payload.categoryId,
      priority: payload.priority,
      status: "NEW",
      authorId: userId,
      isAnonymous: payload.isAnonymous,
      assigneeId: null,
      possibleSolution: payload.possibleSolution?.trim() || null,
      decision: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      dueDate: payload.dueDate,
    };
    db.requests.unshift(req);
    db.history.push(buildHistory(req.id, null, "NEW", userId, "Обращение зарегистрировано", db.history));
    for (const att of payload.attachments.slice(0, 5)) {
      db.attachments.push({
        id: `att_${req.id}_${Math.random().toString(36).slice(2, 8)}`,
        requestId: req.id,
        name: att.name,
        size: att.size,
        mime: att.mime,
        dataUrl: att.dataUrl,
        createdAt: now,
      });
    }
    this.persist();
    return req;
  }

  async updateRequest(
    actorId: string,
    requestId: string,
    patch: RequestPatch,
    historyComment?: string | null,
  ): Promise<Request> {
    const db = this.DB;
    const req = db.requests.find((r) => r.id === requestId);
    if (!req) throw new Error("Обращение не найдено");
    const prev: Request = { ...req };
    Object.assign(req, patch);
    req.updatedAt = new Date().toISOString();
    if (patch.status && patch.status !== prev.status) {
      req.resolvedAt =
        patch.status === "IMPLEMENTED" || patch.status === "REJECTED"
          ? new Date().toISOString()
          : null;
      db.history.push(buildHistory(req.id, prev.status, patch.status, actorId, historyComment ?? null, db.history));
    }
    this.persist();
    return { ...req };
  }

  async addComment(userId: string, requestId: string, text: string, kind: Comment["kind"]): Promise<Comment> {
    const db = this.DB;
    const comment: Comment = {
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      requestId,
      authorId: userId,
      text: text.trim(),
      kind,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(comment);
    const req = db.requests.find((r) => r.id === requestId);
    if (req) req.updatedAt = comment.createdAt;
    this.persist();
    return comment;
  }

  async sendNotifications(items: NotificationDraft[]): Promise<void> {
    const db = this.DB;
    for (const it of items) {
      db.notifications.push({
        id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        userId: it.userId,
        requestId: it.requestId,
        kind: it.kind,
        title: it.title,
        body: it.body,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    this.persist();
  }

  async markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
    const db = this.DB;
    for (const n of db.notifications) {
      if (n.userId !== userId) continue;
      if (!ids || ids.includes(n.id)) n.read = true;
    }
    this.persist();
  }

  async updateProfile(
    userId: string,
    patch: Partial<Pick<AuthedUser, "name" | "position" | "department" | "color">>,
  ): Promise<AuthedUser> {
    const p = this.DB.profiles.find((x) => x.id === userId);
    if (!p) throw new Error("Профиль не найден");
    Object.assign(p, patch);
    this.persist();
    return toAuthed(p);
  }

  async changePassword(userId: string, nextPassword: string): Promise<void> {
    const p = this.DB.profiles.find((x) => x.id === userId);
    if (!p) throw new Error("Профиль не найден");
    if (nextPassword.length < 8) throw new Error("Пароль должен быть не короче 8 символов");
    p.password = nextPassword;
    this.persist();
  }

  async createUser(
    actorId: string,
    payload: { name: string; email: string; role: Role; position: string; department: string; password?: string },
  ): Promise<AuthedUser> {
    void actorId;
    const db = this.DB;
    const exists = db.profiles.some(
      (x) => x.email.toLowerCase() === payload.email.trim().toLowerCase(),
    );
    if (exists) throw new Error("Пользователь с таким e-mail уже существует");
    if (payload.password && payload.password.length < 8) throw new Error("Пароль должен быть не короче 8 символов");
    const p: DemoDb["profiles"][number] = {
      id: `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      email: payload.email.trim().toLowerCase(),
      name: payload.name.trim(),
      role: payload.role,
      position: payload.position.trim(),
      department: payload.department.trim(),
      color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`,
      createdAt: new Date().toISOString(),
      password: payload.password || "demo12345",
    };
    db.profiles.push(p);
    this.persist();
    return toAuthed(p);
  }

  async updateUser(
    actorId: string,
    userId: string,
    patch: Partial<Pick<AuthedUser, "name" | "role" | "position" | "department">>,
  ): Promise<AuthedUser> {
    void actorId;
    const p = this.DB.profiles.find((x) => x.id === userId);
    if (!p) throw new Error("Пользователь не найден");
    const admins = this.DB.profiles.filter((x) => x.role === "ADMIN" && x.id !== userId).length;
    if (p.role === "ADMIN" && patch.role && patch.role !== "ADMIN" && admins === 0) {
      throw new Error("В системе должен остаться хотя бы один администратор");
    }
    Object.assign(p, patch);
    this.persist();
    return toAuthed(p);
  }

  async deleteUser(actorId: string, userId: string): Promise<void> {
    const db = this.DB;
    if (actorId === userId) throw new Error("Нельзя удалить собственную учётную запись");
    const admins = db.profiles.filter((x) => x.role === "ADMIN").length;
    const target = db.profiles.find((x) => x.id === userId);
    if (target?.role === "ADMIN" && admins <= 1) {
      throw new Error("В системе должен остаться хотя бы один администратор");
    }
    db.profiles = db.profiles.filter((x) => x.id !== userId);
    db.requests = db.requests.filter((r) => r.authorId !== userId);
    this.persist();
  }

  async addCategory(actorId: string, name: string): Promise<Category> {
    void actorId;
    const db = this.DB;
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Введите название категории");
    if (db.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Такая категория уже существует");
    }
    const cat: Category = {
      id: `cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      active: true,
    };
    db.categories.push(cat);
    this.persist();
    return cat;
  }

  async updateCategory(
    actorId: string,
    categoryId: string,
    patch: Partial<Pick<Category, "name" | "active">>,
  ): Promise<Category> {
    void actorId;
    const cat = this.DB.categories.find((c) => c.id === categoryId);
    if (!cat) throw new Error("Категория не найдена");
    if (cat.system && patch.active === false) {
      throw new Error("Системную категорию нельзя отключить");
    }
    Object.assign(cat, patch);
    this.persist();
    return cat;
  }

  async setRoutingRule(actorId: string, categoryId: string, assigneeId: string | null): Promise<void> {
    void actorId;
    const db = this.DB;
    const existing = db.routing.find((x) => x.categoryId === categoryId);
    if (existing) existing.assigneeId = assigneeId;
    else db.routing.push({ categoryId, assigneeId });
    this.persist();
  }

  async resetDemo(): Promise<void> {
    const db = freshDb();
    saveDb(db);
    this.db = db;
  }
}

export function isSystemCategory(id: string): boolean {
  return SYSTEM_CATEGORIES.includes(id);
}

export { loadDb as loadDemoDb };
