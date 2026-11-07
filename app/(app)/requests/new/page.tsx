"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
  Workflow,
  HelpCircle,
  Send,
  Paperclip,
  FileText,
  File,
  X,
  EyeOff,
  PartyPopper,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { NewRequestPayload, Priority, Request, RequestType } from "@/lib/types";
import { TYPES, PRIORITIES, TYPE_ICONS_HINT, PRIORITIES_ORDER } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { Button, Card, Field, Input, Select, Textarea, Switch } from "@/components/ui/kit";
import { toast } from "@/components/ui/toast";
import { z } from "zod";

const TYPE_OPTIONS: Array<{ value: RequestType; label: string; icon: typeof Lightbulb }> = [
  { value: "IDEA", label: TYPES.IDEA.label, icon: Lightbulb },
  { value: "PROBLEM", label: TYPES.PROBLEM.label, icon: AlertTriangle },
  { value: "SUGGESTION", label: TYPES.SUGGESTION.label, icon: ThumbsUp },
  { value: "PROCESS", label: TYPES.PROCESS.label, icon: Workflow },
  { value: "OTHER", label: TYPES.OTHER.label, icon: HelpCircle },
];

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Заголовок должен содержать минимум 10 символов")
    .max(140, "Заголовок слишком длинный (максимум 140 символов)"),
  description: z
    .string()
    .trim()
    .min(30, "Опишите ситуацию подробнее — минимум 30 символов"),
  categoryId: z.string().min(1, "Выберите категорию"),
  type: z.string(),
  priority: z.string(),
  possibleSolution: z.string().optional(),
});

const MAX_FILE = 700 * 1024; // 700 KB per file
const MAX_FILES = 3;

interface PendingFile {
  name: string;
  size: number;
  mime: string;
  dataUrl: string;
}

export default function NewRequestPage() {
  const { user, snapshot, createRequest } = useApp();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<RequestType>("IDEA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [possibleSolution, setPossibleSolution] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Request | null>(null);

  const activeCategories = useMemo(
    () => (snapshot?.categories ?? []).filter((c) => c.active),
    [snapshot],
  );

  if (!user) return null;

  // Success screen
  if (created) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-[560px] overflow-hidden anim-scale-in">
          <div className="border-b border-ink-100 bg-gradient-to-r from-good-50 to-surface px-6 py-8 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-good-100 text-good-600">
              <PartyPopper size={26} />
            </span>
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink-900">Обращение зарегистрировано</h1>
            <p className="mt-1.5 text-[13.5px] text-ink-500">
              Обращение получено системой и передано на рассмотрение. Автору отправлено уведомление.
            </p>
            <div className="num mx-auto mt-4 inline-flex rounded-xl border border-ink-100 bg-surface px-5 py-3 shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Номер</span>
              <span className="ml-3 text-[20px] font-extrabold text-brand-600">{created.id}</span>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-xl bg-ink-50 px-4 py-3.5">
              <div className="text-[13.5px] font-bold text-ink-900">{created.title}</div>
              <div className="mt-1 text-[12px] text-ink-500">
                Создано {formatDate(created.createdAt)} · Статус: Новое{isAnonymous ? " · Отправлено анонимно" : ""}
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => router.push(`/requests/${created.id}`)}>
                Открыть карточку
                <ArrowRight size={15} />
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCreated(null);
                  setTitle("");
                  setDescription("");
                  setCategoryId("");
                  setPossibleSolution("");
                  setFiles([]);
                  setIsAnonymous(false);
                  setPriority("MEDIUM");
                  setType("IDEA");
                }}
              >
                <RotateCcw size={15} />
                Новое обращение
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const pickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const room = MAX_FILES - files.length;
    if (room <= 0) {
      toast("warning", "Не больше 3 файлов", "Снимите лишние вложения, чтобы добавить новые.");
      return;
    }
    for (const f of list.slice(0, room)) {
      if (f.size > MAX_FILE) {
        toast("warning", f.name, "Файл больше 700 КБ — прикрепите скрин поменьше или приложите ссылкой в описании.");
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      setFiles((prev) => [...prev, { name: f.name, size: f.size, mime: f.type || "application/octet-stream", dataUrl }]);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = async () => {
    const parsed = schema.safeParse({ title, description, categoryId, type, priority, possibleSolution });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      toast("warning", "Проверьте форму", "Поля с ошибками выделены красным.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const payload: NewRequestPayload = {
        title,
        description,
        type,
        categoryId,
        priority,
        possibleSolution: possibleSolution.trim() || null,
        isAnonymous,
        attachments: files,
        dueDate: dueDate || null,
      };
      const req = await createRequest(payload);
      setCreated(req);
      toast("success", `Обращение ${req.id} зарегистрировано`, "Ответственный будет назначен администратором.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* toast уже показан в store */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        title="Создать обращение"
        subtitle="Опишите идею, проблему или предложение. Система присвоит уникальный номер и передаст обращение ответственному."
      />

      <div className="space-y-4">
        {/* Form Card */}
        <Card className="p-5 sm:p-7">
          {/* Type selector */}
          <div className="mb-6">
            <span className="label">Тип обращения</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setType(o.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all duration-150",
                    type === o.value
                      ? "border-brand-500 bg-brand-50/70 shadow-card ring-1 ring-brand-500/30"
                      : "border-ink-200 bg-surface hover:border-ink-300 hover:bg-ink-50",
                  )}
                >
                  <o.icon
                    size={19}
                    className={type === o.value ? "text-brand-600" : "text-ink-400"}
                  />
                  <span className={cn("text-[12px] font-semibold", type === o.value ? "text-brand-700" : "text-ink-600")}>
                    {o.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink-400">{TYPE_ICONS_HINT[type]}</p>
          </div>

          <div className="space-y-4">
            <Field label="Заголовок" error={errors.title}>
              <Input
                className="field-lg"
                placeholder="Например: автоматизация учёта остатков на складе №2"
                value={title}
                maxLength={141}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="mt-1 text-right text-[11px] text-ink-300">{title.length}/140</div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Категория" error={errors.categoryId}>
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field-lg">
                  <option value="">Выберите категорию…</option>
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Приоритет" hint="Определяет срочность. Критические рассматриваются первыми.">
                <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="field-lg">
                  {PRIORITIES_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITIES[p].label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Подробное описание"
              error={errors.description}
              hint="Что происходит, где, как часто и на кого влияет. Чем конкретнее — тем быстрее решение."
            >
              <Textarea
                rows={6}
                className="min-h-[140px]"
                placeholder="Опишите ситуацию: что происходит, когда началось, кто и как затронут, к каким последствиям приводит…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="mt-1 text-right text-[11px] text-ink-300">{description.length} символов</div>
            </Field>

            <Field
              label="Возможное решение"
              hint="Необязательно. Если видите путь решения — предложите, это ускорит рассмотрение."
            >
              <Textarea
                rows={3}
                placeholder="Например: объединить точки выгрузки в один кольцевой маршрут, обучить водителей новому порядку…"
                value={possibleSolution}
                onChange={(e) => setPossibleSolution(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* Attachments */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14.5px] font-bold text-ink-900">Вложения</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                Фото, скриншоты, документы. До {MAX_FILES} файлов по 700 КБ.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}>
              <Paperclip size={14} />
              Прикрепить
            </Button>
          </div>
          <input ref={fileInput} type="file" multiple hidden onChange={pickFiles} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />

          {files.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2.5">
                  {f.mime.startsWith("image/") ? (
                    <img src={f.dataUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      {f.name.endsWith(".pdf") ? <FileText size={18} /> : <File size={18} />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-ink-800">{f.name}</div>
                    <div className="num text-[11px] text-ink-400">{(f.size / 1024).toFixed(0)} КБ</div>
                  </div>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-md p-1 text-ink-400 transition-colors hover:bg-bad-50 hover:text-bad-600"
                    aria-label={`Удалить ${f.name}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-4 py-8 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <Paperclip size={20} className="text-ink-300" />
              <span className="text-[13px] font-medium text-ink-500">
                Перетащите файлы сюда или нажмите для выбора
              </span>
              <span className="text-[11px] text-ink-400">JPG, PNG, PDF, DOC, XLS до 700 КБ</span>
            </button>
          )}
        </Card>

        {/* Anonymity */}
        <Card className="p-5 sm:p-6">
          <Switch
            checked={isAnonymous}
            onChange={setIsAnonymous}
            label="Отправить анонимно"
            description="Ваше имя будет скрыто от ответственных. Вы сохраните возможность отслеживать статус и переписку по обращению."
          />
          {isAnonymous && (
            <div className="anim-fade-up mt-4 flex items-start gap-2.5 rounded-xl border border-warn-100 bg-warn-50 px-3.5 py-3">
              <EyeOff size={15} className="mt-0.5 shrink-0 text-warn-600" />
              <p className="text-[12.5px] leading-relaxed text-warn-600">
                Обращение будет показано как «Анонимно». По регламенту анонимные обращения рассматриваются наравне
                с именными, однако администрация сможет увидеть отправителя в целях безопасности.
              </p>
            </div>
          )}
        </Card>

        {/* Submit */}
        <div className="flex flex-col-reverse items-stretch gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink-400">
            После отправки создаются запись в реестре, история статусов и автоматические уведомления.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button size="lg" loading={busy} onClick={() => void submit()}>
              <Send size={16} />
              {busy ? "Регистрируем…" : "Отправить обращение"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
