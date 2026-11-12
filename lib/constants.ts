import type { Priority, RequestStatus, RequestType, Role } from "./types";

export const STATUSES: Record<RequestStatus, { label: string; dot: string; chip: string }> = {
  NEW: {
    label: "Новое",
    dot: "bg-info-500",
    chip: "bg-info-50 text-info-600 border border-info-100",
  },
  IN_REVIEW: {
    label: "На рассмотрении",
    dot: "bg-warn-500",
    chip: "bg-warn-50 text-warn-600 border border-warn-100",
  },
  NEEDS_INFO: {
    label: "Требуется информация",
    dot: "bg-brand-400",
    chip: "bg-brand-50 text-brand-700 border border-brand-100",
  },
  APPROVED: {
    label: "Одобрено",
    dot: "bg-good-500",
    chip: "bg-good-50 text-good-700 border border-good-100",
  },
  REJECTED: {
    label: "Отклонено",
    dot: "bg-bad-500",
    chip: "bg-bad-50 text-bad-600 border border-bad-100",
  },
  IN_PROGRESS: {
    label: "В работе",
    dot: "bg-brand-500",
    chip: "bg-brand-50 text-brand-600 border border-brand-100",
  },
  IMPLEMENTED: {
    label: "Реализовано",
    dot: "bg-good-600",
    chip: "bg-good-100 text-good-700 border border-good-100",
  },
};

export const OPEN_STATUSES: RequestStatus[] = [
  "NEW",
  "IN_REVIEW",
  "NEEDS_INFO",
  "APPROVED",
  "IN_PROGRESS",
];

export const PRIORITIES: Record<Priority, { label: string; chip: string }> = {
  LOW: { label: "Низкий", chip: "bg-ink-100 text-ink-600" },
  MEDIUM: { label: "Средний", chip: "bg-info-50 text-info-600" },
  HIGH: { label: "Высокий", chip: "bg-warn-50 text-warn-600" },
  CRITICAL: { label: "Критический", chip: "bg-bad-50 text-bad-600" },
};

export const TYPES: Record<RequestType, { label: string }> = {
  IDEA: { label: "Идея" },
  PROBLEM: { label: "Проблема" },
  SUGGESTION: { label: "Предложение" },
  PROCESS: { label: "Улучшение процесса" },
  OTHER: { label: "Другое" },
  FEEDBACK: { label: "Положительный отзыв" },
};

export const TYPE_ICONS_HINT: Record<RequestType, string> = {
  IDEA: "Идея — что-то новое, что можно сделать",
  PROBLEM: "Проблема — то, что мешает работе сейчас",
  SUGGESTION: "Предложение — конкретное изменение",
  PROCESS: "Улучшение процесса — оптимизация workflows",
  OTHER: "Другое — всё остальное",
  FEEDBACK: "Положительный отзыв — то, что стоит сохранить и развивать",
};

export const ROLES: Record<Role, { label: string; hint: string }> = {
  EMPLOYEE: { label: "Сотрудник", hint: "Создание обращений и отслеживание статусов" },
  MANAGER: { label: "Ответственный", hint: "Рассмотрение и работа с назначенными обращениями" },
  ADMIN: { label: "Администратор", hint: "Полное управление системой и пользователями" },
};

export const STATUS_ORDER: RequestStatus[] = [
  "NEW",
  "IN_REVIEW",
  "NEEDS_INFO",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
];

export const PRIORITIES_ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/** System categories mirror the demo dataset (A-001…A-020) and are always active. */
export const SYSTEM_CATEGORIES: string[] = [
  "cat-01", // Межотдельное взаимодействие
  "cat-02", // Информационная прозрачность
  "cat-03", // Каталог и данные
  "cat-04", // Обучение
  "cat-05", // Документооборот
  "cat-06", // Регламенты
  "cat-07", // Интеграции и IT
  "cat-08", // Знания и наставничество
  "cat-09", // Договорная работа
  "cat-10", // Задачи и коммуникации
  "cat-11", // Оперативность
  "cat-12", // Коммуникации
  "cat-13", // Проектная деятельность
  "cat-14", // Планирование ресурсов
  "cat-15", // Постановка задач
  "cat-16", // Корпоративная среда
  "cat-17", // Хранение документов
  "cat-18", // Прозрачность результатов
];

export const DEMO_ACCOUNTS = [
  { email: "employee@modus.demo", role: "EMPLOYEE" as Role },
  { email: "manager@modus.demo", role: "MANAGER" as Role },
  { email: "admin@modus.demo", role: "ADMIN" as Role },
];

export const DEMO_PASSWORD = "demo12345";
