import type { Profile, Category, Request, Comment, HistoryEntry, Snapshot, RequestStatus, RequestType, Priority, RoutingRule } from "./types";
import { DEMO_PASSWORD } from "./constants";

const DAY = 86400000;
const HOUR = 3600000;

function msAgo(days: number): number {
  return Date.now() - days * DAY;
}

export function colorFor(seed: string): string {
  const colors = ["#4f46e5", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0d9488", "#db2777"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return colors[h % colors.length];
}

interface SeedReq {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  cat: string;
  priority: Priority;
  status: RequestStatus;
  authorId: string;
  assigneeId: string | null;
  solution?: string | null;
  decision?: string | null;
  rejection?: string | null;
  createdDaysAgo: number;
  resolvedDaysAfter?: number;
  /** срок исполнения — через N дней после регистрации (null = без срока) */
  dueInDays?: number | null;
  timeline: Array<[RequestStatus | null, RequestStatus, string, string | null, number]>;
  comments: Array<[string, string, Comment["kind"], number]>;
}

export function buildSeed(): Snapshot {
  // ===================== ПОЛЬЗОВАТЕЛИ (15, пароль demo12345) =====================
  const users: Array<{
    id: string;
    email: string;
    name: string;
    role: Profile["role"];
    position: string;
    department: string;
    daysAgo: number;
  }> = [
    { id: "u-admin",    email: "admin@modus.demo",      name: "Игорь Северов",      role: "ADMIN",    position: "Администратор системы",       department: "Управление",  daysAgo: 120 },
    { id: "u-manager",  email: "manager@modus.demo",    name: "Марина Зайцева",     role: "MANAGER",  position: "Руководитель направления",    department: "Управление",  daysAgo: 115 },
    { id: "u-employee", email: "employee@modus.demo",   name: "Павел Дорохов",      role: "EMPLOYEE", position: "Сотрудник закупок",           department: "Закупки",     daysAgo: 110 },
    { id: "u-proj",     email: "proj@modus.demo",       name: "Анна Литвинова",     role: "EMPLOYEE", position: "Сотрудник проектирования",    department: "Проекты",     daysAgo: 108 },
    { id: "u-buh",      email: "buh@modus.demo",        name: "Светлана Кораблёва", role: "EMPLOYEE", position: "Сотрудник бухгалтерии",       department: "Финансы",     daysAgo: 106 },
    { id: "u-sales1",   email: "sales1@modus.demo",     name: "Дмитрий Волков",     role: "EMPLOYEE", position: "Менеджер по продажам",        department: "Продажи",     daysAgo: 104 },
    { id: "u-coord",    email: "coord@modus.demo",      name: "Ксения Морозова",    role: "EMPLOYEE", position: "Координатор проекта",         department: "Проекты",     daysAgo: 102 },
    { id: "u-pm",       email: "pm@modus.demo",         name: "Роман Гудков",       role: "EMPLOYEE", position: "Руководитель проекта",        department: "Проекты",     daysAgo: 100 },
    { id: "u-office",   email: "office@modus.demo",     name: "Ольга Петрова",      role: "EMPLOYEE", position: "Сотрудник офиса",             department: "Офис",        daysAgo: 98 },
    { id: "u-zakup",    email: "zakup@modus.demo",      name: "Сергей Калинин",     role: "MANAGER",  position: "Руководитель закупок",        department: "Закупки",     daysAgo: 96 },
    { id: "u-it",       email: "it@modus.demo",         name: "Максим Тарасов",     role: "MANAGER",  position: "IT-специалист",               department: "IT",          daysAgo: 94 },
    { id: "u-buhmgr",   email: "buh-manager@modus.demo",name: "Наталья Ефимова",    role: "MANAGER",  position: "Руководитель бухгалтерии",    department: "Финансы",     daysAgo: 92 },
    { id: "u-sales",    email: "sales@modus.demo",      name: "Артём Логинов",      role: "MANAGER",  position: "Руководитель продаж",         department: "Продажи",     daysAgo: 90 },
    { id: "u-project",  email: "project@modus.demo",    name: "Виктория Стрельцова",role: "MANAGER",  position: "Руководитель проектов",       department: "Проекты",     daysAgo: 88 },
    { id: "u-hr",       email: "hr@modus.demo",         name: "Елена Домрачева",    role: "MANAGER",  position: "HR-руководитель",             department: "Персонал",    daysAgo: 86 },
  ];

  const profiles: Profile[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    position: u.position,
    department: u.department,
    color: colorFor(u.id),
    createdAt: new Date(msAgo(u.daysAgo)).toISOString(),
    password: DEMO_PASSWORD,
  }));

  // ===================== КАТЕГОРИИ (18, по датасету) =====================
  const categories: Category[] = [
    { id: "cat-01", name: "Межотдельное взаимодействие", active: true, system: true },
    { id: "cat-02", name: "Информационная прозрачность", active: true, system: true },
    { id: "cat-03", name: "Каталог и данные", active: true, system: true },
    { id: "cat-04", name: "Обучение", active: true, system: true },
    { id: "cat-05", name: "Документооборот", active: true, system: true },
    { id: "cat-06", name: "Регламенты", active: true, system: true },
    { id: "cat-07", name: "Интеграции и IT", active: true, system: true },
    { id: "cat-08", name: "Знания и наставничество", active: true, system: true },
    { id: "cat-09", name: "Договорная работа", active: true, system: true },
    { id: "cat-10", name: "Задачи и коммуникации", active: true, system: true },
    { id: "cat-11", name: "Оперативность", active: true, system: true },
    { id: "cat-12", name: "Коммуникации", active: true, system: true },
    { id: "cat-13", name: "Проектная деятельность", active: true, system: true },
    { id: "cat-14", name: "Планирование ресурсов", active: true, system: true },
    { id: "cat-15", name: "Постановка задач", active: true, system: true },
    { id: "cat-16", name: "Корпоративная среда", active: true, system: true },
    { id: "cat-17", name: "Хранение документов", active: true, system: true },
    { id: "cat-18", name: "Прозрачность результатов", active: true, system: true },
  ];

  // ===================== ОБРАЩЕНИЯ (MV-0001…MV-0020 ← A-001…A-020) =====================
  const reqs: SeedReq[] = [
    {
      // A-001 · Проблема · Межотдельное взаимодействие · Новое
      id: "MV-0001",
      title: "Добавить обязательные поля назначения изделия в заявках на оборудование",
      description:
        "В заявках на приобретение оборудования иногда не хватает назначения изделия и требуемых параметров. Предлагаю добавить обязательные поля, чтобы сократить число уточнений.",
      type: "PROBLEM",
      cat: "cat-01",
      priority: "MEDIUM",
      status: "NEW",
      authorId: "u-employee",
      assigneeId: "u-zakup",
      createdDaysAgo: 3,
      dueInDays: 10,
      timeline: [[null, "NEW", "u-employee", "Обращение зарегистрировано", 0]],
      comments: [
        ["u-zakup", "Запросите, пожалуйста, пример корректно заполненной заявки — на его основе оценим изменение шаблона.", "info_request", 20],
      ],
    },
    {
      // A-002 · Предложение · Информационная прозрачность · На рассмотрении
      id: "MV-0002",
      title: "Показывать общий статус проекта поставщикам без коммерческих деталей",
      description:
        "При общении с поставщиками полезно видеть общую стадию проекта без доступа к коммерческим деталям. Можно ли показывать краткий статус и ориентировочные контрольные даты?",
      type: "SUGGESTION",
      cat: "cat-02",
      priority: "MEDIUM",
      status: "IN_REVIEW",
      authorId: "u-employee",
      assigneeId: "u-manager",
      createdDaysAgo: 9,
      timeline: [
        [null, "NEW", "u-employee", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Определяем перечень доступных статусов и источник их обновления", 40],
      ],
      comments: [
        ["u-manager", "Прорабатываем, какие статусы можно показывать внешним участникам и откуда брать контрольные даты.", "message", 44],
      ],
    },
    {
      // A-003 · Проблема · Каталог и данные · В работе · ПРОСРОЧЕНО
      id: "MV-0003",
      title: "Разные обозначения одного изделия в рабочих материалах",
      description:
        "В рабочих материалах иногда встречаются разные обозначения одного изделия. Это увеличивает время проверки спецификации. Нужен понятный способ находить актуальную карточку позиции.",
      type: "PROBLEM",
      cat: "cat-03",
      priority: "HIGH",
      status: "IN_PROGRESS",
      authorId: "u-proj",
      assigneeId: "u-zakup",
      createdDaysAgo: 28,
      dueInDays: 21, // срок истёк 7 дней назад
      timeline: [
        [null, "NEW", "u-proj", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-zakup", "Проверяем каталог на дубли обозначений", 36],
        ["IN_REVIEW", "IN_PROGRESS", "u-zakup", "Готовим правило проверки и корректировки номенклатуры", 120],
      ],
      comments: [
        ["u-zakup", "Собрали примеры дублей по двум позициям. Правило проверки уже на согласовании, срок сдвигается.", "message", 130],
        ["u-proj", "Готов приложить ещё примеры, если нужно расширить выборку.", "message", 150],
      ],
    },
    {
      // A-004 · Предложение · Обучение · Реализовано
      id: "MV-0004",
      title: "Календарь коротких занятий по новым товарным линейкам",
      description:
        "Было бы полезно проводить короткие занятия по новым товарным линейкам с разбором типовых запросов. Предлагаю составить календарь таких встреч.",
      type: "SUGGESTION",
      cat: "cat-04",
      priority: "LOW",
      status: "IMPLEMENTED",
      authorId: "u-employee",
      assigneeId: "u-hr",
      solution: "Календарь коротких обучающих встреч по новым товарным линейкам.",
      decision: "Пример результата: запланирован пробный обучающий семинар. Формат закреплён за HR и ответственным за обучение.",
      createdDaysAgo: 28,
      resolvedDaysAfter: 14,
      timeline: [
        [null, "NEW", "u-employee", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-hr", "Оцениваем загрузку тренеров и аудиторию", 30],
        ["IN_REVIEW", "IN_PROGRESS", "u-hr", "Составляем календарь встреч", 130],
        ["IN_PROGRESS", "IMPLEMENTED", "u-hr", "Пробный обучающий семинар запланирован", 420],
      ],
      comments: [
        ["u-hr", "Идея поддержана. Первый пробный семинар уже стоит в календаре, состав аудитории собираем.", "message", 140],
        ["u-employee", "Спасибо! После семинара смогу уверенно отвечать на типовые запросы по новой линейке.", "message", 430],
      ],
    },
    {
      // A-005 · Проблема · Документооборот · Ожидает уточнения
      id: "MV-0005",
      title: "Видно этап и ответственного по межподразделенческим документам",
      description:
        "При обработке документов между подразделениями возникают дополнительные вопросы о том, на каком этапе находится пакет. Хотелось бы видеть ответственного и текущий статус.",
      type: "PROBLEM",
      cat: "cat-05",
      priority: "MEDIUM",
      status: "NEEDS_INFO",
      authorId: "u-buh",
      assigneeId: "u-buhmgr",
      createdDaysAgo: 6,
      timeline: [
        [null, "NEW", "u-buh", "Обращение зарегистрировано", 0],
        ["NEW", "NEEDS_INFO", "u-buhmgr", "Запрошены уточнения по видам документов", 22],
      ],
      comments: [
        ["u-buhmgr", "Уточните, пожалуйста, какие виды документов чаще всего «зависают» и какие этапы согласования в них участвуют.", "info_request", 24],
      ],
    },
    {
      // A-006 · Предложение · Регламенты · На рассмотрении
      id: "MV-0006",
      title: "Пошаговая памятка для сквозных операций нескольких подразделений",
      description:
        "Предлагаю собрать короткую пошаговую памятку для операций, в которых последовательно участвуют несколько подразделений, и определить порядок актуализации памятки.",
      type: "SUGGESTION",
      cat: "cat-06",
      priority: "MEDIUM",
      status: "IN_REVIEW",
      authorId: "u-buh",
      assigneeId: "u-manager",
      createdDaysAgo: 13,
      timeline: [
        [null, "NEW", "u-buh", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Подбираем владельца процесса для черновика инструкции", 55],
      ],
      comments: [
        ["u-manager", "Ищем владельца процесса и согласуем черновик инструкции. Как только определимся — соберём памятку.", "message", 60],
      ],
    },
    {
      // A-007 · Проблема · Интеграции и IT · Новое
      id: "MV-0007",
      title: "Повторный ввод одних и тех же сведений в разных рабочих системах",
      description:
        "Иногда повторный ввод одних и тех же сведений в разных рабочих системах занимает много времени. Нужна оценка, какие операции можно синхронизировать безопасно.",
      type: "PROBLEM",
      cat: "cat-07",
      priority: "HIGH",
      status: "NEW",
      authorId: "u-buh",
      assigneeId: "u-it",
      createdDaysAgo: 4,
      timeline: [[null, "NEW", "u-buh", "Обращение зарегистрировано", 0]],
      comments: [],
    },
    {
      // A-008 · Предложение · Знания и наставничество · Реализовано
      id: "MV-0008",
      title: "Памятка по типовым ошибкам при передаче сложных задач новичкам",
      description:
        "При передаче сложной задачи новому сотруднику полезен короткий разбор типовых ошибок и контактов, к которым можно обратиться за помощью. Предлагаю сделать такую памятку.",
      type: "SUGGESTION",
      cat: "cat-08",
      priority: "LOW",
      status: "IMPLEMENTED",
      authorId: "u-buh",
      assigneeId: "u-manager",
      solution: "Памятка с разбором типовых ошибок и списком контактов для помощи.",
      decision: "Пример результата: создана учебная инструкция. Памятка опубликована и доступна новым сотрудникам.",
      createdDaysAgo: 38,
      resolvedDaysAfter: 14,
      timeline: [
        [null, "NEW", "u-buh", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Собираем типовые ошибки с руководителями", 26],
        ["IN_REVIEW", "IN_PROGRESS", "u-manager", "Составляем учебную инструкцию", 180],
        ["IN_PROGRESS", "IMPLEMENTED", "u-manager", "Учебная инструкция создана и опубликована", 320],
      ],
      comments: [
        ["u-manager", "Черновик инструкции собран по итогам опроса наставников. Разместим на портале для новичков.", "message", 200],
        ["u-buh", "Инструкция выручает: передаю задачи новичкам по чек-листу, вопросов стало меньше.", "message", 330],
      ],
    },
    {
      // A-009 · Проблема · Договорная работа · В работе · ПРОСРОЧЕНО
      id: "MV-0009",
      title: "Неясно, кто готовит и кто проверяет версию приложения к договору",
      description:
        "Не всегда понятно, кто готовит очередную версию приложения к договору и кто должен проверить её перед отправкой. Это приводит к повторным согласованиям.",
      type: "PROBLEM",
      cat: "cat-09",
      priority: "HIGH",
      status: "IN_PROGRESS",
      authorId: "u-sales1",
      assigneeId: "u-sales",
      createdDaysAgo: 21,
      dueInDays: 18, // срок истёк 3 дня назад
      timeline: [
        [null, "NEW", "u-sales1", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-sales", "Разбираем, где теряется ответственность за версии", 30],
        ["IN_REVIEW", "IN_PROGRESS", "u-sales", "Разграничиваем этапы подготовки, проверки и утверждения", 200],
      ],
      comments: [
        ["u-sales", "Разграничиваем этапы: готовит менеджер, проверяет договорной отдел, утверждает руководитель. Драфт регламента на выходных.", "message", 210],
        ["u-sales1", "Повторные согласования по последним трём договорам ушли бы, если бы проверяющий был зафиксирован в системе.", "message", 260],
      ],
    },
    {
      // A-010 · Предложение · Задачи и коммуникации · На рассмотрении
      id: "MV-0010",
      title: "Не закрывать рабочую задачу до подтверждения результата заказчиком",
      description:
        "Предлагаю не закрывать рабочую задачу до подтверждения заказчиком результата внутри компании, чтобы связанные вопросы оставались в общей истории обсуждения.",
      type: "SUGGESTION",
      cat: "cat-10",
      priority: "MEDIUM",
      status: "IN_REVIEW",
      authorId: "u-sales1",
      assigneeId: "u-sales",
      createdDaysAgo: 11,
      timeline: [
        [null, "NEW", "u-sales1", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-sales", "Проверяем применимость правила к разным типам задач", 48],
      ],
      comments: [
        ["u-sales", "Проверяем, подходит ли правило для разных типов задач: разовые и регулярные ведутся по-разному.", "message", 52],
      ],
    },
    {
      // A-011 · Проблема · Оперативность · Новое · без ответственного (очередь назначения)
      id: "MV-0011",
      title: "Прогнозируемые сроки ответа смежных подразделений при срочных запросах",
      description:
        "При срочной подготовке клиентского предложения сложно прогнозировать сроки ответа от смежных подразделений. Хотелось бы видеть ожидаемый срок и уведомление при задержке.",
      type: "PROBLEM",
      cat: "cat-11",
      priority: "HIGH",
      status: "NEW",
      authorId: "u-sales1",
      assigneeId: null,
      createdDaysAgo: 2,
      timeline: [[null, "NEW", "u-sales1", "Обращение зарегистрировано", 0]],
      comments: [],
    },
    {
      // A-012 · Предложение · Коммуникации · На рассмотрении
      id: "MV-0012",
      title: "Единое место для итоговых решений по рабочим задачам",
      description:
        "Рабочие обсуждения распределены по нескольким каналам, из-за чего теряется контекст. Предлагаю выбрать единое место для итоговых решений по задаче.",
      type: "SUGGESTION",
      cat: "cat-12",
      priority: "LOW",
      status: "IN_REVIEW",
      authorId: "u-sales1",
      assigneeId: "u-it",
      createdDaysAgo: 17,
      timeline: [
        [null, "NEW", "u-sales1", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-it", "Сравниваем варианты фиксации итогов", 60],
      ],
      comments: [
        ["u-it", "Сравниваем варианты: карточка задачи в Битрикс24 против сводной страницы. Предложим правила фиксации итогов.", "message", 66],
      ],
    },
    {
      // A-013 · Проблема · Проектная деятельность · Ожидает уточнения
      id: "MV-0013",
      title: "История изменений строк спецификации при смене состава оборудования",
      description:
        "Когда изменяется состав оборудования в проекте, не всегда ясно, какие строки спецификации были пересмотрены. Нужна более заметная история изменений.",
      type: "PROBLEM",
      cat: "cat-13",
      priority: "MEDIUM",
      status: "NEEDS_INFO",
      authorId: "u-coord",
      assigneeId: "u-project",
      createdDaysAgo: 8,
      timeline: [
        [null, "NEW", "u-coord", "Обращение зарегистрировано", 0],
        ["NEW", "NEEDS_INFO", "u-project", "Запрошен формат исходных файлов", 26],
      ],
      comments: [
        ["u-project", "Уточните формат исходных файлов спецификаций и то, как сейчас сравниваете версии — от этого зависит решение.", "info_request", 28],
      ],
    },
    {
      // A-014 · Предложение · Планирование ресурсов · На рассмотрении · срок через 5 дней
      id: "MV-0014",
      title: "Показ загруженности проектной группы на ближайшие недели",
      description:
        "Предлагаю показывать загруженность проектной группы на ближайшие недели в укрупнённом виде. Так будет проще согласовывать сроки запуска новых задач.",
      type: "SUGGESTION",
      cat: "cat-14",
      priority: "MEDIUM",
      status: "IN_REVIEW",
      authorId: "u-coord",
      assigneeId: "u-project",
      createdDaysAgo: 16,
      dueInDays: 19, // остаётся ~5 дней — попадает во фильтр «до 7 дней»
      timeline: [
        [null, "NEW", "u-coord", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-project", "Согласуем показатели загрузки и права просмотра", 40],
      ],
      comments: [
        ["u-project", "Согласуем показатели загрузки: вероятно, достаточно уровня «свободен / загружен / перегружен».", "message", 44],
      ],
    },
    {
      // A-015 · Проблема · Постановка задач · В работе · срок через 2 дня
      id: "MV-0015",
      title: "Минимальный набор данных при постановке задач",
      description:
        "Некоторые поручения поступают без ожидаемого результата и даты завершения. Предлагаю договориться о минимальном наборе данных при постановке задачи.",
      type: "PROBLEM",
      cat: "cat-15",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      authorId: "u-pm",
      assigneeId: "u-manager",
      createdDaysAgo: 24,
      dueInDays: 26, // остаётся ~2 дня — попадает во фильтр «до 7 дней»
      timeline: [
        [null, "NEW", "u-pm", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Готовим шаблон постановки задач", 34],
        ["IN_REVIEW", "IN_PROGRESS", "u-manager", "Согласуем шаблон с руководителями направлений", 150],
      ],
      comments: [
        ["u-manager", "Готовим шаблон: цель, срок, приоритет, ответственный. После согласования включим в регламент постановки задач.", "message", 160],
      ],
    },
    {
      // A-016 · Предложение · Обучение · Новое
      id: "MV-0016",
      title: "Пилотное практическое занятие с учебными образцами оборудования",
      description:
        "Для новых сотрудников полезны практические демонстрации оборудования, а не только презентации. Предлагаю пилотное занятие с учебными образцами.",
      type: "SUGGESTION",
      cat: "cat-04",
      priority: "LOW",
      status: "NEW",
      authorId: "u-pm",
      assigneeId: "u-hr",
      createdDaysAgo: 5,
      timeline: [[null, "NEW", "u-pm", "Обращение зарегистрировано", 0]],
      comments: [],
    },
    {
      // A-017 · Предложение · Корпоративная среда · Отклонено (мотивированный отказ)
      id: "MV-0017",
      title: "Отдельная зона коротких перерывов рядом с рабочими помещениями",
      description:
        "Предлагаю организовать отдельную небольшую зону для коротких перерывов рядом с рабочими помещениями.",
      type: "SUGGESTION",
      cat: "cat-16",
      priority: "LOW",
      status: "REJECTED",
      authorId: "u-office",
      assigneeId: "u-admin",
      rejection:
        "Мотивированный ответ: сейчас нет подходящего помещения; вернуться к вопросу при перепланировке.",
      createdDaysAgo: 33,
      resolvedDaysAfter: 12,
      timeline: [
        [null, "NEW", "u-office", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-admin", "Оцениваем свободные помещения", 40],
        ["IN_REVIEW", "REJECTED", "u-admin", "Подходящего помещения сейчас нет — вернуться при перепланировке", 260],
      ],
      comments: [
        ["u-admin", "Проверили планировку: свободных площадей под зону отдыха сейчас нет. Предложение отклонено с возвратом к вопросу при перепланировке офиса.", "message", 270],
      ],
    },
    {
      // A-018 · Положительный отзыв · Корпоративная среда · Закрыто
      id: "MV-0018",
      title: "Положительный отзыв: внутренние учебные встречи",
      description:
        "Хочу отметить пользу внутренних учебных встреч: после них стало легче обращаться к коллегам за консультацией. Было бы хорошо сохранить этот формат.",
      type: "FEEDBACK",
      cat: "cat-16",
      priority: "LOW",
      status: "IMPLEMENTED",
      authorId: "u-office",
      assigneeId: "u-hr",
      decision: "Положительный отзыв зафиксирован и передан организаторам обучения; формат встреч сохранён.",
      createdDaysAgo: 41,
      resolvedDaysAfter: 9,
      timeline: [
        [null, "NEW", "u-office", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-hr", "Передаём отзыв организаторам обучения", 24],
        ["IN_REVIEW", "IMPLEMENTED", "u-hr", "Отзыв зафиксирован, формат встреч сохранён", 190],
      ],
      comments: [
        ["u-hr", "Спасибо за отзыв! Передали организаторам обучения — формат встреч продолжается, следующая тема уже в плане.", "message", 200],
      ],
    },
    {
      // A-019 · Проблема · Хранение документов · На рассмотрении
      id: "MV-0019",
      title: "Правила именования и архивирования версий инструкций в общих папках",
      description:
        "В общих папках трудно быстро определить актуальную редакцию инструкции. Можно ли закрепить единые правила именования и архивирования старых версий?",
      type: "PROBLEM",
      cat: "cat-17",
      priority: "MEDIUM",
      status: "IN_REVIEW",
      authorId: "u-coord",
      assigneeId: "u-admin",
      createdDaysAgo: 14,
      timeline: [
        [null, "NEW", "u-coord", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-admin", "Согласуем порядок хранения и владельцев папок", 45],
      ],
      comments: [
        ["u-admin", "Готовим порядок хранения: единые правила именования, владелец папки, архивирование старых версий.", "message", 50],
      ],
    },
    {
      // A-020 · Предложение · Прозрачность результатов · Новое · без ответственного (очередь назначения)
      id: "MV-0020",
      title: "Краткий обзор завершённых внутренних улучшений для сотрудников",
      description:
        "Предлагаю публиковать краткий обзор завершённых внутренних улучшений, чтобы сотрудники видели результат направленных предложений.",
      type: "SUGGESTION",
      cat: "cat-18",
      priority: "LOW",
      status: "NEW",
      authorId: "u-employee",
      assigneeId: null,
      createdDaysAgo: 1,
      timeline: [[null, "NEW", "u-employee", "Обращение зарегистрировано", 0]],
      comments: [],
    },
  ];

  const requests: Request[] = [];
  const comments: Comment[] = [];
  const history: HistoryEntry[] = [];

  for (const r of reqs) {
    const createdAt = new Date(msAgo(r.createdDaysAgo)).toISOString();
    const resolvedAt =
      r.resolvedDaysAfter != null
        ? new Date(new Date(createdAt).getTime() + r.resolvedDaysAfter * DAY).toISOString()
        : null;
    requests.push({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      categoryId: r.cat,
      priority: r.priority,
      status: r.status,
      authorId: r.authorId,
      isAnonymous: false,
      assigneeId: r.assigneeId,
      possibleSolution: r.solution ?? null,
      decision: r.decision ?? null,
      rejectionReason: r.rejection ?? null,
      createdAt,
      updatedAt: createdAt,
      resolvedAt,
      dueDate:
        r.dueInDays != null
          ? new Date(new Date(createdAt).getTime() + r.dueInDays * DAY).toISOString()
          : null,
    });

    r.timeline.forEach((t, idx) => {
      const [, toStatus, changedBy, cmt, hours] = t;
      history.push({
        id: `h_${r.id}_${idx}`,
        requestId: r.id,
        fromStatus: idx === 0 ? null : r.timeline[idx - 1][1],
        toStatus,
        changedById: changedBy,
        comment: cmt,
        createdAt: new Date(new Date(createdAt).getTime() + hours * HOUR).toISOString(),
      });
    });

    for (const [author, text, kind, hours] of r.comments) {
      comments.push({
        id: `c_${r.id}_${hours}_${author}`,
        requestId: r.id,
        authorId: author,
        text,
        kind,
        createdAt: new Date(new Date(createdAt).getTime() + hours * HOUR).toISOString(),
      });
    }
  }

  // ===================== ПРАВИЛА МАРШРУТИЗАЦИИ (категория → ответственный) =====================
  const routing: RoutingRule[] = [
    { categoryId: "cat-01", assigneeId: "u-manager" },
    { categoryId: "cat-02", assigneeId: "u-manager" },
    { categoryId: "cat-03", assigneeId: "u-zakup" },
    { categoryId: "cat-04", assigneeId: "u-hr" },
    { categoryId: "cat-05", assigneeId: "u-buhmgr" },
    { categoryId: "cat-06", assigneeId: "u-manager" },
    { categoryId: "cat-07", assigneeId: "u-it" },
    { categoryId: "cat-08", assigneeId: "u-manager" },
    { categoryId: "cat-09", assigneeId: "u-sales" },
    { categoryId: "cat-10", assigneeId: "u-sales" },
    { categoryId: "cat-11", assigneeId: "u-manager" },
    { categoryId: "cat-12", assigneeId: "u-it" },
    { categoryId: "cat-13", assigneeId: "u-project" },
    { categoryId: "cat-14", assigneeId: "u-project" },
    { categoryId: "cat-15", assigneeId: "u-manager" },
    { categoryId: "cat-16", assigneeId: "u-admin" },
    { categoryId: "cat-17", assigneeId: "u-admin" },
    { categoryId: "cat-18", assigneeId: "u-manager" },
  ];

  // ===================== УВЕДОМЛЕНИЯ =====================
  const daysById: Record<string, number> = {};
  for (const r of reqs) daysById[r.id] = r.createdDaysAgo;

  const notifications: Snapshot["notifications"] = [];
  const addNotif = (
    userId: string,
    requestId: string,
    kind: Snapshot["notifications"][number]["kind"],
    title: string,
    body: string,
    read: boolean,
    hoursAfter: number,
  ) => {
    notifications.push({
      id: `n_${requestId}_${userId}_${hoursAfter}`,
      userId,
      requestId,
      kind,
      title,
      body,
      read,
      createdAt: new Date(new Date(msAgo(daysById[requestId])).getTime() + hoursAfter * HOUR).toISOString(),
    });
  };

  // Регистрация: автору по каждому обращению
  for (const r of reqs) {
    addNotif(r.authorId, r.id, "REGISTERED", `Обращение ${r.id} зарегистрировано`, "Ваше обращение получено и передано в систему", r.createdDaysAgo > 7, 0);
  }
  // Назначение ответственных (по маршрутизации)
  addNotif("u-zakup", "MV-0001", "ASSIGNED", "Новое назначение MV-0001", "Обращение маршрутизировано по категории «Межотдельное взаимодействие»", true, 1);
  addNotif("u-manager", "MV-0002", "ASSIGNED", "Новое назначение MV-0002", "Обращение маршрутизировано по категории «Информационная прозрачность»", true, 1);
  addNotif("u-zakup", "MV-0003", "ASSIGNED", "Новое назначение MV-0003", "Высокий приоритет: дубли обозначений в каталоге", true, 1);
  addNotif("u-hr", "MV-0004", "ASSIGNED", "Новое назначение MV-0004", "Календарь обучающих встреч по товарным линейкам", true, 1);
  addNotif("u-buhmgr", "MV-0005", "ASSIGNED", "Новое назначение MV-0005", "Статус межподразделенческих документов", true, 1);
  addNotif("u-manager", "MV-0006", "ASSIGNED", "Новое назначение MV-0006", "Пошаговая памятка для сквозных операций", true, 1);
  addNotif("u-it", "MV-0007", "ASSIGNED", "Новое назначение MV-0007", "Высокий приоритет: повторный ввод данных в системах", true, 1);
  addNotif("u-manager", "MV-0008", "ASSIGNED", "Новое назначение MV-0008", "Памятка для наставников и новичков", true, 1);
  addNotif("u-sales", "MV-0009", "ASSIGNED", "Новое назначение MV-0009", "Высокий приоритет: ответственность за версии приложений к договорам", true, 1);
  addNotif("u-sales", "MV-0010", "ASSIGNED", "Новое назначение MV-0010", "Правило закрытия задач до подтверждения результата", true, 1);
  addNotif("u-it", "MV-0012", "ASSIGNED", "Новое назначение MV-0012", "Единое место для итоговых решений", true, 1);
  addNotif("u-project", "MV-0013", "ASSIGNED", "Новое назначение MV-0013", "История изменений спецификаций", true, 1);
  addNotif("u-project", "MV-0014", "ASSIGNED", "Новое назначение MV-0014", "Загруженность проектной группы", true, 1);
  addNotif("u-manager", "MV-0015", "ASSIGNED", "Новое назначение MV-0015", "Минимальный набор данных при постановке задач", true, 1);
  addNotif("u-hr", "MV-0016", "ASSIGNED", "Новое назначение MV-0016", "Пилотное занятие с учебными образцами", true, 1);
  addNotif("u-admin", "MV-0017", "ASSIGNED", "Новое назначение MV-0017", "Зона коротких перерывов", true, 1);
  addNotif("u-hr", "MV-0018", "ASSIGNED", "Новое назначение MV-0018", "Положительный отзыв об учебных встречах", true, 1);
  addNotif("u-admin", "MV-0019", "ASSIGNED", "Новое назначение MV-0019", "Правила именования версий документов", true, 1);
  // Очередь назначения — администратору
  addNotif("u-admin", "MV-0011", "REGISTERED", "Новое обращение MV-0011", "Оперативность: требует назначения ответственного", false, 1);
  addNotif("u-admin", "MV-0020", "REGISTERED", "Новое обращение MV-0020", "Прозрачность результатов: требует назначения ответственного", false, 0);
  // Результаты
  addNotif("u-employee", "MV-0004", "IMPLEMENTED", "MV-0004 реализовано", "Пробный обучающий семинар запланирован", false, 420);
  addNotif("u-buh", "MV-0008", "IMPLEMENTED", "MV-0008 реализовано", "Учебная инструкция создана и опубликована", false, 320);
  addNotif("u-office", "MV-0018", "IMPLEMENTED", "MV-0018 закрыто", "Отзыв зафиксирован и передан организаторам обучения", false, 190);
  addNotif("u-office", "MV-0017", "DECISION", "MV-0017 отклонено", "Мотивированный ответ доступен в карточке обращения", false, 260);
  // Уточнения
  addNotif("u-buh", "MV-0005", "INFO_REQUESTED", "Запрошена информация MV-0005", "Наталья Ефимова уточняет виды документов и этапы согласования", true, 24);
  addNotif("u-coord", "MV-0013", "INFO_REQUESTED", "Запрошена информация MV-0013", "Виктория Стрельцова уточняет формат файлов спецификаций", true, 28);
  addNotif("u-employee", "MV-0001", "INFO_REQUESTED", "Запрошена информация MV-0001", "Сергей Калинин: пришлите пример корректно заполненной заявки", false, 20);
  // Комментарии
  addNotif("u-proj", "MV-0003", "COMMENT", "Новый комментарий MV-0003", "Сергей Калинин: правило проверки уже на согласовании…", false, 130);
  addNotif("u-sales1", "MV-0009", "COMMENT", "Новый комментарий MV-0009", "Артём Логинов: разграничиваем этапы подготовки и проверки…", false, 210);
  addNotif("u-pm", "MV-0015", "COMMENT", "Новый комментарий MV-0015", "Марина Зайцева: готовим шаблон постановки задач…", false, 160);
  // Напоминания о сроках (сгенерированные системой — дедупликация по requestId+kind)
  addNotif("u-zakup", "MV-0003", "DEADLINE", "Срок истёк: MV-0003", "Срок по обращению истёк. Требуется решение или обновление срока.", false, 495);
  addNotif("u-sales", "MV-0009", "DEADLINE", "Срок истёк: MV-0009", "Срок по обращению истёк. Требуется решение или обновление срока.", false, 440);

  return {
    profiles,
    categories,
    requests,
    comments,
    history,
    notifications,
    attachments: [],
    routing,
    publicStats: computePublicStats(requests),
  };
}

export function computePublicStats(allRequests: Request[]): Snapshot["publicStats"] {
  const total = allRequests.length;
  const implemented = allRequests.filter((r) => r.status === "IMPLEMENTED").length;
  const resolved = allRequests.filter((r) => r.resolvedAt);
  const avgResolutionHours =
    resolved.length > 0
      ? resolved.reduce(
          (acc, r) => acc + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / HOUR,
          0,
        ) / resolved.length
      : 0;
  return {
    total,
    implemented,
    implementationRate: total > 0 ? (implemented / total) * 100 : 0,
    avgResolutionHours,
  };
}
