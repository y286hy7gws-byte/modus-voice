"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  UserCheck,
  EyeOff,
  Tag,
  History,
  MessagesSquare,
  Paperclip,
  Download,
  FileText,
  File,
  Ban,
  CheckCircle2,
  Rocket,
  ArrowRightLeft,
  UserCog,
  Settings2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { enrichOne } from "@/lib/selectors";
import { STATUSES, TYPES } from "@/lib/constants";
import type { Request as Req, RequestStatus } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatHours, relativeDeadline } from "@/lib/utils";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/badges";
import { Timeline } from "@/components/timeline";
import { CommentThread } from "@/components/comment-thread";
import { Avatar, Button, Card, EmptyState, Modal, Select, Field } from "@/components/ui/kit";
import { toast } from "@/components/ui/toast";

const DECISION_META: Record<"APPROVED" | "REJECTED" | "IMPLEMENTED", { title: string; label: string; placeholder: string; btnClass: string; minLen: number }> = {
  APPROVED: {
    title: "Одобрить обращение",
    label: "Решение (что одобрено, следующие шаги)",
    placeholder: "Например: идея одобрена, подключаем производство и логистику для подготовки пилота…",
    btnClass: "good",
    minLen: 20,
  },
  REJECTED: {
    title: "Отклонить обращение",
    label: "Причина отклонения (обязательна)",
    placeholder: "Например: данные телематики не подтверждают эффект, предложение нецелесообразно…",
    btnClass: "danger",
    minLen: 20,
  },
  IMPLEMENTED: {
    title: "Отметить как реализованное",
    label: "Результат реализации",
    placeholder: "Например: внедрено с 1 июня, экономия подтверждена данными, автору объявлена благодарность…",
    btnClass: "primary",
    minLen: 20,
  },
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, snapshot, nameOf, addComment, changeStatus, assign, setDueDate, saveDecision } = useApp();

  const request = useMemo<Req | undefined>(() => {
    return snapshot?.requests.find((r) => r.id === params.id);
  }, [snapshot, params.id]);

  const [statusModal, setStatusModal] = useState<{ to: RequestStatus } | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [assignChoice, setAssignChoice] = useState<string>("");
  const [dueChoice, setDueChoice] = useState<string>("");
  const [dueModal, setDueModal] = useState(false);
  const [decisionModal, setDecisionModal] = useState<"APPROVED" | "REJECTED" | "IMPLEMENTED" | null>(null);
  const [decisionText, setDecisionText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-16" />
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className="skeleton min-h-[420px]" />
          <div className="skeleton min-h-[420px]" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <EmptyState
        icon={<Ban size={26} />}
        title="Обращение не найдено или недоступно"
        description="Обращение могло быть удалено или у вас нет прав на его просмотр. Напоминание: сотрудники видят только свои обращения."
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={15} />
            Назад
          </Button>
        }
      />
    );
  }

  const enriched = enrichOne(snapshot, user, request.id)!;
  const history = snapshot.history.filter((h) => h.requestId === request.id);
  const comments = snapshot.comments.filter((c) => c.requestId === request.id);
  const attachments = snapshot.attachments.filter((a) => a.requestId === request.id);

  // Anonymity: hide the author's real identity in per-entry views (history
  // journal, comment avatars) for viewers who must not see it.
  const hideAuthor = request.isAnonymous && user.id !== request.authorId && user.role !== "ADMIN";
  const nameOfMasked = (id: string | null) =>
    id && hideAuthor && id === request.authorId ? "Анонимно" : nameOf(id);
  const colorOfMasked = (id: string) =>
    hideAuthor && id === request.authorId
      ? "#8a90a0"
      : snapshot.profiles.find((p) => p.id === id)?.color;
  const roleOfMasked = (id: string) =>
    hideAuthor && id === request.authorId
      ? undefined
      : snapshot.profiles.find((p) => p.id === id)?.role;

  const isAuthor = request.authorId === user.id;
  const isAssignee = request.assigneeId === user.id;
  const canManage = user.role === "ADMIN" || (user.role === "MANAGER" && isAssignee);
  const canAssign = user.role === "ADMIN";
  const managers = snapshot.profiles.filter((p) => p.role === "MANAGER");
  const closurePending = ["APPROVED", "IN_PROGRESS"].includes(request.status);
  const closed = ["IMPLEMENTED", "REJECTED"].includes(request.status);

  const doStatusChange = async (to: RequestStatus, comment: string | null) => {
    setBusy(true);
    try {
      await changeStatus(request, to, comment);
      setStatusModal(null);
      setStatusComment("");
    } catch {
      /* handled centrally */
    } finally {
      setBusy(false);
    }
  };

  const doAssign = async () => {
    setBusy(true);
    try {
      await assign(request, assignChoice || null);
      setAssignModal(false);
    } catch {
      /* handled centrally */
    } finally {
      setBusy(false);
    }
  };

  const doDue = async () => {
    setBusy(true);
    try {
      await setDueDate(request, dueChoice ? new Date(dueChoice).toISOString() : null);
      setDueModal(false);
    } finally {
      setBusy(false);
    }
  };

  const doDecision = async () => {
    if (!decisionModal) return;
    const meta = DECISION_META[decisionModal];
    if (decisionText.trim().length < meta.minLen) {
      toast("warning", "Опишите решение подробнее", `Минимум ${meta.minLen} символов — это то, что увидит автор.`);
      return;
    }
    setBusy(true);
    try {
      const ok = await saveDecision(request, decisionModal, decisionText.trim());
      if (ok) {
        setDecisionModal(null);
        setDecisionText("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 transition-colors hover:text-brand-600"
        >
          <ArrowLeft size={15} />
          Назад к списку
        </button>
      </div>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50/60 to-surface px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num rounded-lg bg-white px-2.5 py-1 text-[13px] font-extrabold text-brand-600 ring-1 ring-brand-100">
              {request.id}
            </span>
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
            <TypeBadge type={request.type} />
            {enriched.authorMasked && (
              <span className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                <EyeOff size={11} />
                Анонимно
              </span>
            )}
          </div>
          <h1 className="mt-3 text-[21px] font-extrabold leading-snug tracking-[-0.02em] text-ink-900">
            {request.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              Создано {formatDateTime(request.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Tag size={13} />
              {enriched.categoryName}
            </span>
            {request.resolvedAt && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                Решено {formatDate(request.resolvedAt)}
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Description */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">Описание</h2>
            <div className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-ink-700">
              {request.description}
            </div>
            {request.possibleSolution && (
              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700">
                  Предложенное решение
                </div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{request.possibleSolution}</div>
              </div>
            )}
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-ink-900">
                <Paperclip size={15} className="text-ink-400" />
                Вложения
                <span className="num text-[12px] font-semibold text-ink-400">{attachments.length}</span>
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.dataUrl}
                    download={a.name}
                    className="group flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    {a.mime.startsWith("image/") ? (
                      <img src={a.dataUrl} alt={a.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                        {a.name.endsWith(".pdf") ? <FileText size={17} /> : <File size={17} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink-800">{a.name}</span>
                      <span className="num block text-[11px] text-ink-400">{(a.size / 1024).toFixed(0)} КБ</span>
                    </span>
                    <Download size={15} className="text-ink-300 transition-colors group-hover:text-brand-600" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Final decision */}
          {(request.decision || request.rejectionReason) && (
            <Card
              className={cn(
                "overflow-hidden",
                request.status === "IMPLEMENTED" && "border-good-100",
                request.status === "REJECTED" && "border-bad-100",
              )}
            >
              <div
                className={cn(
                  "px-5 py-4 sm:px-6",
                  request.status === "IMPLEMENTED" && "bg-good-50",
                  request.status === "REJECTED" && "bg-bad-50",
                  request.status === "APPROVED" && "bg-good-50",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em]",
                    request.status === "REJECTED" ? "text-bad-600" : "text-good-700",
                  )}
                >
                  {request.status === "IMPLEMENTED" ? <Rocket size={14} /> : request.status === "REJECTED" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                  {request.status === "IMPLEMENTED" ? "Итог: реализовано" : request.status === "REJECTED" ? "Итог: отклонено" : "Решение принято"}
                </div>
                <div className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-800">
                  {request.status === "REJECTED" ? request.rejectionReason : request.decision}
                </div>
                {request.resolvedAt && (
                  <span className="num mt-2 block text-[11.5px] text-ink-400">
                    Зафиксировано {formatDate(request.resolvedAt)}
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Comments */}
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-ink-900">
              <MessagesSquare size={15} className="text-ink-400" />
              Обсуждение
              <span className="num text-[12px] font-semibold text-ink-400">{comments.length}</span>
            </h2>
            <div className="mt-4">
              <CommentThread
                comments={comments}
                user={user}
                nameOf={nameOfMasked}
                colorOf={colorOfMasked}
                roleOf={roleOfMasked}
                onSubmit={async (text) => {
                  setBusy(true);
                  try {
                    await addComment(request.id, text);
                    return true;
                  } catch {
                    return false;
                  } finally {
                    setBusy(false);
                  }
                }}
                showInfoRequestButton={canManage && !closed && request.status !== "NEEDS_INFO"}
                onInfoRequest={async (text) => {
                  setBusy(true);
                  try {
                    await addComment(request.id, text, "info_request");
                    await changeStatus(request, "NEEDS_INFO", `Запрошена дополнительная информация: ${text.slice(0, 80)}`);
                    return true;
                  } catch {
                    return false;
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Action panel */}
          {canManage && !closed && (
            <Card className="border-brand-100 p-5">
              <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-ink-900">
                <Settings2 size={15} className="text-brand-600" />
                {canAssign ? "Управление обращением" : "Работа с обращением"}
              </h2>
              <div className="mt-4 space-y-2.5">
                {request.status === "NEW" ? (
                  <Button
                    className="w-full"
                    loading={busy}
                    onClick={() => void doStatusChange("IN_REVIEW", `${user.name} принял обращение на рассмотрение`)}
                  >
                    <ArrowRightLeft size={15} />
                    Взять на рассмотрение
                  </Button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {request.status !== "APPROVED" && (
                        <Button
                          variant="good"
                          onClick={() => {
                            setDecisionModal("APPROVED");
                            setDecisionText("");
                          }}
                        >
                          <CheckCircle2 size={15} />
                          Одобрить
                        </Button>
                      )}
                      {["IN_REVIEW", "NEEDS_INFO", "APPROVED"].includes(request.status) && (
                        <Button
                          onClick={() => void doStatusChange("IN_PROGRESS", "Работа по обращению начата")}
                        >
                          <ArrowRightLeft size={15} />
                          В работу
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setDecisionModal("IMPLEMENTED");
                          setDecisionText("");
                        }}
                      >
                        <Rocket size={15} />
                        Реализовано
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setDecisionModal("REJECTED");
                          setDecisionText("");
                        }}
                      >
                        <Ban size={15} />
                        Отклонить
                      </Button>
                      {request.status === "NEEDS_INFO" && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void doStatusChange("IN_REVIEW", "Информация получена, рассмотрение продолжается")
                          }
                        >
                          <ArrowRightLeft size={15} />
                          На рассмотрение
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
                Изменение статуса фиксируется в истории обращения. Автор получает уведомление автоматически.
              </p>
            </Card>
          )}

          {/* Info card */}
          <Card className="p-5">
            <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink-900">Реквизиты обращения</h2>
            <dl className="mt-3 space-y-3">
              <div className="flex items-start gap-3">
                <User size={15} className="mt-0.5 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Автор</dt>
                  <dd className="mt-0.5 text-[13px] font-semibold text-ink-900">
                    {enriched.authorMasked ? (
                      <span className="italic text-ink-500">Анонимно</span>
                    ) : (
                      <span>
                        {enriched.authorName}
                        {isAuthor && <span className="ml-1.5 rounded bg-ink-100 px-1 py-px text-[10px] font-bold text-ink-500">ВЫ</span>}
                      </span>
                    )}
                    {user.role === "ADMIN" && request.isAnonymous && (
                      <span className="ml-1.5 rounded bg-warn-50 px-1 py-px text-[10px] font-bold text-warn-600">
                        анонимная отправка
                      </span>
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserCheck size={15} className="mt-0.5 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Ответственный</dt>
                  <dd className="mt-0.5 flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                    {request.assigneeId ? (
                      <>
                        <Avatar name={enriched.assigneeName ?? "?"} color={enriched.assigneeColor ?? undefined} size={22} />
                        <span className="truncate">
                          {enriched.assigneeName}
                          {isAssignee && <span className="ml-1.5 rounded bg-ink-100 px-1 py-px text-[10px] font-bold text-ink-500">ВЫ</span>}
                        </span>
                      </>
                    ) : (
                      <span className="rounded-md bg-warn-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-warn-600">
                        Пока не назначен
                      </span>
                    )}
                  </dd>
                  {canAssign && (
                    <Button variant="secondary" size="sm" className="mt-2" onClick={() => {
                      setAssignChoice(request.assigneeId ?? "");
                      setAssignModal(true);
                    }}>
                      <UserCog size={13} />
                      {request.assigneeId ? "Переназначить" : "Назначить ответственного"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={15} className="mt-0.5 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Контрольный срок</dt>
                  <dd className="mt-0.5 flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                    {request.dueDate ? formatDate(request.dueDate) : "Не установлен"}
                    {request.dueDate && !closed && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-[10.5px] font-bold",
                          relativeDeadline(request.dueDate)?.includes("просрочено")
                            ? "bg-bad-50 text-bad-600"
                            : "bg-good-50 text-good-700",
                        )}
                      >
                        {relativeDeadline(request.dueDate)}
                      </span>
                    )}
                  </dd>
                  {canAssign && (
                    <Button variant="secondary" size="sm" className="mt-2" onClick={() => {
                      setDueChoice(request.dueDate ? request.dueDate.slice(0, 10) : "");
                      setDueModal(true);
                    }}>
                      <Calendar size={13} />
                      Изменить срок
                    </Button>
                  )}
                </div>
              </div>
            </dl>
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold tracking-[-0.01em] text-ink-900">
              <History size={15} className="text-ink-400" />
              История обращения
            </h2>
            <div className="mt-4">
              <Timeline request={request} history={history} nameOf={nameOfMasked} />
            </div>
          </Card>
        </div>
      </div>

      {/* Status modal */}
      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={statusModal ? "Изменить статус обращения" : ""}
        description={statusModal ? `${request.id} · ${STATUSES[statusModal.to].label}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusModal(null)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={() => statusModal && void doStatusChange(statusModal.to, statusComment.trim() || "Статус изменён")}>
              Подтвердить
            </Button>
          </>
        }
      >
        <CommentField value={statusComment} onChange={setStatusComment} label="Комментарий к изменению (попадёт в историю)" placeholder="Например: выезд на склад выполнен, информация собрана…" />
      </Modal>

      {/* Assign modal */}
      <Modal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        title="Назначить ответственного"
        description={request.id}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignModal(false)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={() => void doAssign()}>
              Назначить
            </Button>
          </>
        }
      >
        <Field label="Ответственный сотрудник" hint="Он получит уведомление и сможет вести обращение.">
          <Select value={assignChoice} onChange={(e) => setAssignChoice(e.target.value)}>
            <option value="">— Снять ответственного —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.position} ({m.department})
              </option>
            ))}
            {user.role === "ADMIN" && (
              <option value={user.id}>
                {user.name} · Администратор
              </option>
            )}
          </Select>
        </Field>
      </Modal>

      {/* Due date modal */}
      <Modal
        open={dueModal}
        onClose={() => setDueModal(false)}
        title="Контрольный срок"
        description={request.id}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDueModal(false)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={() => void doDue()}>
              Сохранить
            </Button>
          </>
        }
      >
        <Field label="Дата">
          <input type="date" className="field field-md" value={dueChoice} onChange={(e) => setDueChoice(e.target.value)} />
        </Field>
      </Modal>

      {/* Decision modal */}
      <Modal
        open={!!decisionModal}
        onClose={() => setDecisionModal(null)}
        title={decisionModal ? DECISION_META[decisionModal].title : ""}
        description={decisionModal ? `${request.id} · автор получит уведомление с этой формулировкой` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionModal(null)}>
              Отмена
            </Button>
            <Button
              loading={busy}
              variant={decisionModal === "REJECTED" ? "danger" : decisionModal === "APPROVED" ? "good" : "primary"}
              onClick={() => void doDecision()}
            >
              Зафиксировать решение
            </Button>
          </>
        }
      >
        {decisionModal && (
          <CommentField
            value={decisionText}
            onChange={setDecisionText}
            label={DECISION_META[decisionModal].label}
            placeholder={DECISION_META[decisionModal].placeholder}
            rows={5}
          />
        )}
      </Modal>
    </div>
  );
}

function CommentField({
  value,
  onChange,
  label,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        className="field py-2.5"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
