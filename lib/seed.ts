import type { Profile, Category, Request, Comment, HistoryEntry, Snapshot, RequestStatus, RequestType, Priority } from "./types";
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
  anon?: boolean;
  assigneeId: string | null;
  solution?: string | null;
  decision?: string | null;
  rejection?: string | null;
  createdDaysAgo: number;
  resolvedDaysAfter?: number;
  timeline: Array<[RequestStatus | null, RequestStatus, string, string | null, number]>;
  comments: Array<[string, string, Comment["kind"], number]>;
}

export function buildSeed(): Snapshot {
  const users: Array<{
    id: string;
    email: string;
    name: string;
    role: Profile["role"];
    position: string;
    department: string;
    daysAgo: number;
  }> = [
    { id: "u-admin", email: "admin@modus.demo", name: "Аслан Мусин", role: "ADMIN", position: "Руководитель цифровых сервисов", department: "Департамент IT", daysAgo: 240 },
    { id: "u-manager", email: "manager@modus.demo", name: "Елена Ковалёва", role: "MANAGER", position: "Руководитель логистики", department: "Департамент логистики", daysAgo: 230 },
    { id: "u-mgr-prod", email: "marat.a@modus.demo", name: "Марат Абдрахманов", role: "MANAGER", position: "Начальник производства", department: "Производство", daysAgo: 220 },
    { id: "u-mgr-it", email: "olga.s@modus.demo", name: "Ольга Соколова", role: "MANAGER", position: "Руководитель ИТ-поддержки", department: "Департамент IT", daysAgo: 210 },
    { id: "u-employee", email: "employee@modus.demo", name: "Дмитрий Соколов", role: "EMPLOYEE", position: "Водитель-экспедитор 1 категории", department: "Департамент логистики", daysAgo: 200 },
    { id: "u-emp-hr", email: "aigerim.n@modus.demo", name: "Айгерим Нурланова", role: "EMPLOYEE", position: "HR-специалист", department: "Департамент персонала", daysAgo: 195 },
    { id: "u-emp-prod", email: "victor.p@modus.demo", name: "Виктор Панин", role: "EMPLOYEE", position: "Оператор склада", department: "Производство", daysAgo: 190 },
    { id: "u-emp-it", email: "sergey.l@modus.demo", name: "Сергей Лебедев", role: "EMPLOYEE", position: "Инженер АСУ ТП", department: "Департамент IT", daysAgo: 180 },
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

  const categories: Category[] = [
    { id: "cat-production", name: "Производство", active: true, system: true },
    { id: "cat-logistics", name: "Логистика", active: true, system: true },
    { id: "cat-safety", name: "Безопасность", active: true, system: true },
    { id: "cat-it", name: "IT", active: true, system: true },
    { id: "cat-management", name: "Управление", active: true, system: true },
    { id: "cat-hr", name: "HR", active: true, system: true },
    { id: "cat-other", name: "Другое", active: true, system: true },
  ];

  const reqs: SeedReq[] = [
    // ===================== 5 РЕАЛИЗОВАННЫХ =====================
    {
      id: "MV-0001",
      title: "Оптимизация маршрутов доставки по южному направлению",
      description:
        "Доставку по южному направлению обслуживают две машины, хотя объём позволяет обойтись одним большегрузом с двумя выездами. Сейчас теряется 1,5–2 часа на пересечении маршрутов у склада в Павлодаре. Предлагаю объединить точки выгрузки №4, №7 и №12 в один кольцевой маршрут с чек-листом для водителя. По моему расчёту экономия — около 60 км и до 2 рабочих часов ежедневно.",
      type: "IDEA",
      cat: "cat-logistics",
      priority: "MEDIUM",
      status: "IMPLEMENTED",
      authorId: "u-employee",
      assigneeId: "u-manager",
      solution: "Единый кольцевой маршрут с картой обслуживания точек и чек-листом водителя.",
      decision:
        "Идея одобрена и реализована. С 1 апреля 2025 кольцевой маршрут №4-7-12 закреплён за одним большегрузом. Средняя экономия по данным телематики — 55 км и 1,8 часа ежедневно. Дмитрию объявлена благодарность и выплачена премия 20 000 тенге.",
      createdDaysAgo: 175,
      resolvedDaysAfter: 26,
      timeline: [
        [null, "NEW", "u-employee", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Взяла в работу, анализируем данные телематики", 26],
        ["IN_REVIEW", "APPROVED", "u-manager", "Пилотный маршрут прошёл по всем критериям", 40],
        ["APPROVED", "IN_PROGRESS", "u-manager", "Обновление маршрутных листов, инструктаж водителей", 55],
        ["IN_PROGRESS", "IMPLEMENTED", "u-manager", "Маршрут внедрён по итогам месячного пилота", 96],
      ],
      comments: [
        ["u-manager", "Дмитрий, спасибо за анализ. Телематика за март действительно подтверждает пересечение маршрутов.", "message", 30],
        ["u-employee", "Готов показать расчёт по точкам на встрече в понедельник.", "message", 34],
        ["u-employee", "Маршрут работает: выгрузка заканчивается к 16:00, день стал заметно спокойнее.", "message", 110],
      ],
    },
    {
      id: "MV-0002",
      title: "Автоматизация учёта складских остатков: мобильное сканирование",
      description:
        "Каждую смену три оператора вручную сверяют бумажные остатки с системой. Процесс занимает до полутора часов и почти всегда содержит расхождения. Терминалы сбора данных у нас есть — хватает на пятерых. Предлагаю внедрить сканирование штрих-кодов при приёмке и отгрузке вместо бумажных накладных.",
      type: "SUGGESTION",
      cat: "cat-production",
      priority: "HIGH",
      status: "IMPLEMENTED",
      authorId: "u-emp-prod",
      assigneeId: "u-mgr-prod",
      solution: "Мобильные терминалы сбора данных с интеграцией в систему учёта.",
      decision:
        "Предложение реализовано. С мая 2025 приёмка и отгрузка фиксируются сканированием через терминалы. Расхождения по остаткам снизились с 4,2% до 0,6%. Виктору объявлена благодарность от имени директора производства.",
      createdDaysAgo: 201,
      resolvedDaysAfter: 41,
      timeline: [
        [null, "NEW", "u-emp-prod", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-prod", "Передано в производственный офис, проверяем совместимость", 24],
        ["IN_REVIEW", "APPROVED", "u-mgr-prod", "Отдел ИТ подтвердил совместимость терминалов", 50],
        ["APPROVED", "IN_PROGRESS", "u-mgr-it", "Настройка справочников и тестовый стенд", 75],
        ["IN_PROGRESS", "IMPLEMENTED", "u-mgr-prod", "Первая отгрузка со склада №2 отсканирована без ошибок", 168],
      ],
      comments: [
        ["u-mgr-prod", "Виктор, посчитали эффект: сверка остатков будет занимать не более 20 минут.", "message", 60],
        ["u-emp-prod", "Отлично! Если нужно — сам обучу смену.", "message", 70],
      ],
    },
    {
      id: "MV-0003",
      title: "Разгрузочные ворота склада №2: двойная блокировка",
      description:
        "Погрузчики проходят в зону разгрузки в момент, когда открыт проём, — есть риск наезда на человека. Предлагаю установить механическую двойную блокировку ворот: они открываются только при заглушённом двигателе техники. Дополнительно — светодиодный сигнал «движение запрещено» над проёмом.",
      type: "PROBLEM",
      cat: "cat-safety",
      priority: "CRITICAL",
      status: "IMPLEMENTED",
      authorId: "u-emp-prod",
      assigneeId: "u-mgr-prod",
      solution: "Двойная блокировка ворот и световая сигнализация при открытом проёме.",
      decision:
        "Реализовано. Двойная блокировка установлена на воротах №2 и №5, монтаж завершён 20 июня 2025. За квартал после установки — ноль происшествий в зоне разгрузки.",
      createdDaysAgo: 158,
      resolvedDaysAfter: 47,
      timeline: [
        [null, "NEW", "u-emp-prod", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-prod", "Провели внеплановую проверку зоны разгрузки", 8],
        ["IN_REVIEW", "APPROVED", "u-mgr-prod", "Служба охраны труда поддержала внедрение", 20],
        ["APPROVED", "IN_PROGRESS", "u-mgr-prod", "Закупка комплектующих, план монтажа", 50],
        ["IN_PROGRESS", "IMPLEMENTED", "u-mgr-prod", "Монтаж завершён, инструктаж смены проведён", 148],
      ],
      comments: [
        ["u-mgr-prod", "Виктор, инженер по охране труда уже выехал на склад. Если всё подтвердится — сразу оформляем закупку.", "message", 12],
        ["u-emp-prod", "Инструктаж прошёл, работаем с учётом новой блокировки.", "message", 150],
      ],
    },
    {
      id: "MV-0004",
      title: "Отказ от бумажных заявлений на отгулы и справки",
      description:
        "Заявление на отгул до сих пор печатается, подписывается у руководителя, потом у HR и хранится в офисе. Для справки о доходах — очередь у офис-менеджера. Предлагаю перевести типовые заявления (отгул, справка, командировка) в электронную форму с подписанием через ЭДО и уведомлением в личном кабинете.",
      type: "PROCESS",
      cat: "cat-management",
      priority: "MEDIUM",
      status: "IMPLEMENTED",
      authorId: "u-emp-hr",
      assigneeId: "u-admin",
      solution: "Электронные типовые формы заявлений в HR-кабинете через внутренний ЭДО.",
      decision:
        "Реализовано совместно с отделом ИТ. С сентября 2025 справки и отгулы оформляются в цифровом сервисе, бумажный вариант — только по личному заявлению. Выдача справки ускорилась с 3 дней до 15 минут.",
      createdDaysAgo: 130,
      resolvedDaysAfter: 55,
      timeline: [
        [null, "NEW", "u-emp-hr", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-admin", "Формируем ТЗ, подключаем юристов", 16],
        ["IN_REVIEW", "APPROVED", "u-admin", "Юристы согласовали подписание через ЭДО", 45],
        ["APPROVED", "IN_PROGRESS", "u-admin", "Разработка форм и перенос архива", 78],
        ["IN_PROGRESS", "IMPLEMENTED", "u-admin", "Сервис работает в полной эксплуатации", 150],
      ],
      comments: [
        ["u-admin", "Айгерим, отличное предложение. Даю два релизных окна: сначала справки, потом отгулы.", "message", 20],
        ["u-emp-hr", "Сотрудники уже благодарят: справку берут, не отрываясь от работы.", "message", 160],
      ],
    },
    {
      id: "MV-0005",
      title: "Инфопанель с пятью ключевыми KPI в плановом отделе",
      description:
        "Каждое утро плановый отдел вручную собирает отчёт по KPI из Excel-файлов. Предлагаю большой экран-инфопанель в плановом отделе с пятью ключевыми показателями: выработка, брак, SLA логистики, инциденты, запасы. Данные — напрямую из корпоративных дашбордов, обновление каждые 30 минут.",
      type: "IDEA",
      cat: "cat-management",
      priority: "LOW",
      status: "IMPLEMENTED",
      authorId: "u-emp-it",
      assigneeId: "u-mgr-it",
      solution: "Инфопанель с автообновлением KPI из корпоративных дашбордов.",
      decision:
        "Реализовано. Инфопанель установлена в плановом отделе, данные обновляются каждые 30 минут. Время утреннего сбора отчёта сократилось на 45 минут.",
      createdDaysAgo: 60,
      resolvedDaysAfter: 30,
      timeline: [
        [null, "NEW", "u-emp-it", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-it", "Согласуем с плановым отделом", 18],
        ["IN_REVIEW", "APPROVED", "u-mgr-it", "Поддержано, подключаем к дашборду KPI", 40],
        ["APPROVED", "IN_PROGRESS", "u-mgr-it", "Монтаж экрана и настройка обновлений", 60],
        ["IN_PROGRESS", "IMPLEMENTED", "u-mgr-it", "Панель заработала 10 октября 2025", 90],
      ],
      comments: [
        ["u-mgr-it", "Сергей, экран уже заказан — идёт по хозяйственному бюджету.", "message", 25],
        ["u-emp-it", "Подключил панель к дашборду, обновление полностью автоматическое.", "message", 95],
      ],
    },

    // ===================== 3 ОТКЛОНЁННЫХ =====================
    {
      id: "MV-0006",
      title: "Перенос начала смены водителей на 06:00",
      description:
        "Предлагаю начинать смену водителей в 06:00 вместо 07:00, чтобы доехать до точек разгрузки до утренних пробок и увеличить выработку.",
      type: "SUGGESTION",
      cat: "cat-logistics",
      priority: "MEDIUM",
      status: "REJECTED",
      authorId: "u-employee",
      assigneeId: "u-manager",
      rejection:
        "Анализ телематики за три месяца показал: 60% рейсов фактически начинаются до 06:15, узкое место создают не утренние выезды. Сдвиг графика потребует пересмотра трудовых договоров и согласования со складом без подтверждённого эффекта. Предложение отклонено; за предложившим сохранён приоритет на пересмотр после изменения дорожной ситуации.",
      createdDaysAgo: 90,
      resolvedDaysAfter: 18,
      timeline: [
        [null, "NEW", "u-employee", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Собрали выгрузки телематики за три месяца", 30],
        ["IN_REVIEW", "REJECTED", "u-manager", "Данные не подтверждают системный эффект от переноса смены", 300],
      ],
      comments: [
        ["u-manager", "Дмитрий, посмотрели выгрузки: 60% рейсов уже стартуют до 06:15. Полное обоснование отправил вам на почту.", "message", 300],
      ],
    },
    {
      id: "MV-0007",
      title: "Неформальный дресс-код по пятницам",
      description:
        "Предлагаю официально разрешить неформальный дресс-код по пятницам: офис редко принимает партнёров очно, видеозвонки это не затрагивают.",
      type: "SUGGESTION",
      cat: "cat-hr",
      priority: "LOW",
      status: "REJECTED",
      authorId: "anon",
      anon: true,
      assigneeId: "u-admin",
      rejection:
        "Компания поддерживает единый стандарт внешнего вида для встреч с клиентами и партнёрами. HR-комитет решил сохранить действующий стандарт без исключений по дням недели.",
      createdDaysAgo: 75,
      resolvedDaysAfter: 22,
      timeline: [
        [null, "NEW", "anon", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-admin", "Передано на рассмотрение HR-комитету", 40],
        ["IN_REVIEW", "REJECTED", "u-admin", "Решение HR-комитета: стандарт сохраняется", 260],
      ],
      comments: [
        ["u-admin", "Комитет рассмотрел предложение. Решение — сохранить действующий стандарт.", "note", 260],
      ],
    },
    {
      id: "MV-0008",
      title: "Замена всех ноутбуков бухгалтерии филиала",
      description:
        "Прошу закупить новые ноутбуки для всей бухгалтерии филиала: текущие были приобретены в 2020 году.",
      type: "SUGGESTION",
      cat: "cat-it",
      priority: "MEDIUM",
      status: "REJECTED",
      authorId: "u-emp-it",
      assigneeId: "u-mgr-it",
      rejection:
        "Диагностика показала: 4 из 6 ноутбуков соответствуют требованиям рабочего ПО. Внеочередная закупка всего парка нецелесообразна. Два устаревших ноутбука получили заявку на замену в первом квартале по лимитам ИТ-бюджета.",
      createdDaysAgo: 145,
      resolvedDaysAfter: 15,
      timeline: [
        [null, "NEW", "u-emp-it", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-it", "Провели аудит парка техники", 20],
        ["IN_REVIEW", "REJECTED", "u-mgr-it", "Аудит: замена всего парка нецелесообразна, 2 ноутбука в плане Q1", 230],
      ],
      comments: [
        ["u-mgr-it", "Аудит провели: 4 из 6 машин полностью работоспособны. Две заявки поставлены в очередь обновления.", "message", 230],
      ],
    },

    // ===================== 3 В РАБОТЕ =====================
    {
      id: "MV-0009",
      title: "Единый чек-лист приёма-передачи смены на производстве",
      description:
        "Сменные диспетчеры передают смену по-разному: кто-то блокнотом, кто-то устно координатору. Информация о заготовках и запасах теряется между сменами, дважды фиксировались простои. Предлагаю единый цифровой чек-лист передачи смены: состояние станков, брак, персонал, незавершённые задачи.",
      type: "PROCESS",
      cat: "cat-production",
      priority: "HIGH",
      status: "IN_PROGRESS",
      authorId: "u-emp-prod",
      assigneeId: "u-mgr-prod",
      solution: "Единый чек-лист передачи смены, заполнение — обязательный шаг при передаче.",
      createdDaysAgo: 25,
      timeline: [
        [null, "NEW", "u-emp-prod", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-prod", "Работаем над форматом чек-листа", 30],
        ["IN_REVIEW", "APPROVED", "u-mgr-prod", "Формат утверждён, начинаем пилот на смене А", 120],
        ["APPROVED", "IN_PROGRESS", "u-mgr-prod", "Пилот на смене А, собираем обратную связь операторов", 190],
      ],
      comments: [
        ["u-mgr-prod", "Виктор, чек-лист запускаем в пилоте со смены А с понедельника. Соберите замечания операторов.", "message", 200],
        ["u-emp-prod", "Смена А заполняет чек-лист. Три оператора предложили добавить поле о запчастях.", "message", 210],
        ["u-mgr-prod", "Хороший сигнал, поле о запчастях включу в следующую версию.", "message", 215],
      ],
    },
    {
      id: "MV-0010",
      title: "Проверка вентиляции горячего участка",
      description:
        "На горячем участке в обед фиксируется сильный запах и ощущение духоты. Похоже, вентиляция работает на первой скорости и не справляется с паром. Нужна инженерная проверка и, если потребуется, усиление вытяжки.",
      type: "PROBLEM",
      cat: "cat-safety",
      priority: "HIGH",
      status: "IN_PROGRESS",
      authorId: "anon",
      anon: true,
      assigneeId: "u-mgr-prod",
      createdDaysAgo: 12,
      timeline: [
        [null, "NEW", "anon", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-prod", "Подключил службу эксплуатации, выезд назначен", 40],
        ["IN_REVIEW", "IN_PROGRESS", "u-mgr-prod", "Аудит вентиляции начат, идут замеры скорости потока", 96],
      ],
      comments: [
        ["u-mgr-prod", "Замеры идут: скорость на входе — 0,7 м/с, этого недостаточно для отвода пара. Ждём расчёт по замене вентилятора.", "message", 100],
      ],
    },
    {
      id: "MV-0011",
      title: "Допуск персонала к инструктажам через QR-код",
      description:
        "Инструктаж по технике безопасности фиксируется бумажным журналом, который часто ведётся неполно. Предлагаю QR-код на спецодежде: сотрудник сканирует код при входе в зону и проходит короткий инструктаж на телефоне, отметка автоматически уходит в систему.",
      type: "IDEA",
      cat: "cat-it",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      authorId: "u-emp-it",
      assigneeId: "u-mgr-it",
      solution: "QR-стикеры на спецодежде + веб-страница с коротким тестом на допуск.",
      createdDaysAgo: 40,
      timeline: [
        [null, "NEW", "u-emp-it", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-it", "Согласую со службой охраны труда", 36],
        ["IN_REVIEW", "IN_PROGRESS", "u-mgr-it", "Разрабатываем страницу допуска, два человека — тестовая группа", 140],
      ],
      comments: [
        ["u-mgr-it", "Сергей, страница допуска в тесте: один допуск пройден, один не прошёл из-за отсутствия интернета. Планируем офлайн-режим.", "message", 150],
      ],
    },

    // ===================== ДРУГИЕ СТАТУСЫ =====================
    {
      id: "MV-0012",
      title: "Падение скорости терминала сбора данных в цеху №3",
      description:
        "Терминал сбора данных в цеху №3 за последнюю неделю заметно тормозит при сканировании: ожидание отклика до 10 секунд, операторы дублируют ввод вручную. Подозреваю слабый сигнал Wi-Fi у торцевой стены.",
      type: "PROBLEM",
      cat: "cat-it",
      priority: "HIGH",
      status: "NEEDS_INFO",
      authorId: "u-emp-prod",
      assigneeId: "u-mgr-it",
      createdDaysAgo: 5,
      timeline: [
        [null, "NEW", "u-emp-prod", "Обращение зарегистрировано", 0],
        ["NEW", "NEEDS_INFO", "u-mgr-it", "Запросили данные у смены", 20],
      ],
      comments: [
        ["u-mgr-it", "Уточните, пожалуйста, время сбоя и номер объекта в цеху №3 — поможет фото терминала или лог с метками времени.", "info_request", 25],
        ["u-emp-prod", "Завтра отправлю лог: задержка фиксируется именно при сканировании штрих-кодов серии ГА-39xx.", "message", 40],
      ],
    },
    {
      id: "MV-0013",
      title: "Расписание обучения для операторов новых станков",
      description:
        "Запускаем два новых станка, а обучение операторов запланировано в то же окно, что и производственное задание. Нужно заранее согласовать график обучения, чтобы не срывать смену.",
      type: "SUGGESTION",
      cat: "cat-hr",
      priority: "MEDIUM",
      status: "APPROVED",
      authorId: "u-emp-hr",
      assigneeId: "u-admin",
      solution: "Разбить обучение на двухчасовые блоки в разные смены с онлайн-материалами.",
      createdDaysAgo: 18,
      timeline: [
        [null, "NEW", "u-emp-hr", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-admin", "Согласую график с производством", 28],
        ["IN_REVIEW", "APPROVED", "u-admin", "Утверждено: обучение блоками по сменам", 120],
      ],
      comments: [
        ["u-admin", "Айгерим, бюджет на онлайн-материалы поддержан. Финальный график — на согласовании у Марата.", "message", 130],
      ],
    },
    {
      id: "MV-0014",
      title: "Второй рейс курьерской доставки документов между офисами",
      description:
        "Курьер объезжает офисы раз в день: выезд в 10:00, из-за этого согласование документов растягивается на два дня. Для кадровых бумаг это критично. Прошу добавить второй рейс в 15:30.",
      type: "PROBLEM",
      cat: "cat-logistics",
      priority: "LOW",
      status: "IN_REVIEW",
      authorId: "u-emp-hr",
      assigneeId: "u-manager",
      createdDaysAgo: 8,
      timeline: [
        [null, "NEW", "u-emp-hr", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-manager", "Считаем затраты на второй рейс", 30],
      ],
      comments: [
        ["u-manager", "Считаем: второй рейс — около 12 000 тенге в неделю. Оценку полного эффекта дам до конца недели.", "message", 35],
      ],
    },
    {
      id: "MV-0015",
      title: "Интерактивная карта парковки для гостей",
      description:
        "Партнёры заезжают и паркуются на местах сотрудников. Предлагаю табличку с QR-кодом на въезде: карта гостевых мест и маршрут к ресепшн.",
      type: "IDEA",
      cat: "cat-management",
      priority: "LOW",
      status: "NEW",
      authorId: "u-employee",
      assigneeId: null,
      solution: "QR-табличка на въезде + карта на внутреннем портале.",
      createdDaysAgo: 2,
      timeline: [[null, "NEW", "u-employee", "Обращение зарегистрировано", 0]],
      comments: [],
    },
    {
      id: "MV-0016",
      title: "Нет аптечки первой помощи на маршруте выгрузки №12",
      description:
        "До ближайшего цеха на маршруте выгрузки №12 — 200 метров, аптечки первой помощи там нет. По нормативу аптечка должна находиться в 50 метрах от мест работ с риском травмирования.",
      type: "PROBLEM",
      cat: "cat-safety",
      priority: "CRITICAL",
      status: "IN_REVIEW",
      authorId: "u-emp-prod",
      assigneeId: "u-mgr-prod",
      createdDaysAgo: 3,
      timeline: [
        [null, "NEW", "u-emp-prod", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-mgr-prod", "Инженер по охране труда проверяет зону сегодня", 20],
      ],
      comments: [
        ["u-mgr-prod", "Сегодня инженер проверяет зону. Если подтвердится — аптечка появится до конца недели.", "message", 25],
      ],
    },
    {
      id: "MV-0017",
      title: "Шаблоны ответов для частых писем клиентам",
      description:
        "Ответы клиентам по типовым вопросам — сроки, статус заказа, документы — каждый раз пишутся заново. Предлагаю библиотеку шаблонов с переменными: {клиент}, {номер заказа}, {срок}.",
      type: "SUGGESTION",
      cat: "cat-other",
      priority: "LOW",
      status: "NEW",
      authorId: "u-employee",
      assigneeId: null,
      solution: "Библиотека шаблонов на внутреннем портале с переменными.",
      createdDaysAgo: 1,
      timeline: [[null, "NEW", "u-employee", "Обращение зарегистрировано", 0]],
      comments: [],
    },
    {
      id: "MV-0018",
      title: "Двухфакторная аутентификация для административных доступов",
      description:
        "Доступ к административным панелям складской системы и CRM защищён только паролем. Внутренний аудит рекомендовал включить второй фактор для всех админ-аккаунтов. Предлагаю TOTP-приложение.",
      type: "IDEA",
      cat: "cat-it",
      priority: "HIGH",
      status: "IN_REVIEW",
      authorId: "u-emp-it",
      assigneeId: "u-admin",
      solution: "Включить TOTP для всех административных аккаунтов, контрольный список — у системного администратора.",
      createdDaysAgo: 6,
      timeline: [
        [null, "NEW", "u-emp-it", "Обращение зарегистрировано", 0],
        ["NEW", "IN_REVIEW", "u-admin", "Согласовываю с ответственным за ИБ", 30],
      ],
      comments: [
        ["u-admin", "Сергей, идея поддержана со стороны ИБ. Готовим регламент включения.", "message", 40],
      ],
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
      authorId: r.anon ? null : r.authorId,
      isAnonymous: !!r.anon,
      assigneeId: r.assigneeId,
      possibleSolution: r.solution ?? null,
      decision: r.decision ?? null,
      rejectionReason: r.rejection ?? null,
      createdAt,
      updatedAt: createdAt,
      resolvedAt,
      dueDate: null,
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

  addNotif("u-employee", "MV-0001", "REGISTERED", "Обращение MV-0001 зарегистрировано", "Ваше обращение получено и передано в систему", true, 0);
  addNotif("u-employee", "MV-0001", "ASSIGNED", "Назначен ответственный MV-0001", "Елена Ковалёва назначена ответственной по вашему обращению", true, 27);
  addNotif("u-employee", "MV-0001", "IMPLEMENTED", "MV-0001 реализовано", "Решение: кольцевой маршрут внедрён. Благодарность и премия оформлены", false, 96);
  addNotif("u-employee", "MV-0006", "DECISION", "MV-0006 отклонено", "Причина отклонения доступна в карточке обращения", false, 300);
  addNotif("u-employee", "MV-0017", "REGISTERED", "Обращение MV-0017 зарегистрировано", "Ваше обращение получено и передано в систему", false, 0);
  addNotif("u-emp-prod", "MV-0002", "ASSIGNED", "Назначен ответственный MV-0002", "Марат Абдрахманов взял обращение в работу", true, 24);
  addNotif("u-emp-prod", "MV-0002", "IMPLEMENTED", "MV-0002 реализовано", "Сканирование внедрено: расхождения снизились до 0,6%", false, 168);
  addNotif("u-emp-prod", "MV-0003", "IMPLEMENTED", "MV-0003 реализовано", "Блокировка ворот установлена, благодарность оформлена", false, 148);
  addNotif("u-emp-prod", "MV-0012", "INFO_REQUESTED", "Запрошена информация MV-0012", "Ольга Соколова запросила лог-файл терминала", true, 25);
  addNotif("u-emp-prod", "MV-0009", "COMMENT", "Новый комментарий MV-0009", "Марат Абдрахманов: пилот начнётся со смены А...", false, 200);
  addNotif("u-emp-hr", "MV-0013", "DECISION", "MV-0013 одобрено", "Обучение операторов разбито на блоки по сменам", false, 120);
  addNotif("u-emp-hr", "MV-0013", "REGISTERED", "Обращение MV-0013 зарегистрировано", "Ваше обращение получено и передано в систему", true, 0);
  addNotif("u-emp-it", "MV-0018", "ASSIGNED", "Назначен ответственный MV-0018", "Аслан Мусин рассматривает обращение", true, 30);
  addNotif("u-emp-it", "MV-0011", "COMMENT", "Новый комментарий MV-0011", "Ольга Соколова: тестируем офлайн-режим допуска", true, 150);
  addNotif("u-manager", "MV-0014", "REGISTERED", "Новое назначенное обращение MV-0014", "Второй рейс курьерской доставки требует вашего решения", false, 0);
  addNotif("u-manager", "MV-0014", "STATUS_CHANGED", "Статус MV-0014 изменён", "Обращение принято на рассмотрение", false, 30);
  addNotif("u-admin", "MV-0015", "REGISTERED", "Новое обращение MV-0015", "Интерактивная карта парковки для гостей", false, 0);
  addNotif("u-admin", "MV-0018", "REGISTERED", "Новое обращение MV-0018", "Двухфакторная аутентификация для админ-доступов", false, 0);
  addNotif("u-mgr-prod", "MV-0016", "ASSIGNED", "Новое назначение MV-0016", "Критический приоритет: аптечка на маршруте выгрузки", false, 20);
  addNotif("u-mgr-prod", "MV-0009", "ASSIGNED", "Новое назначение MV-0009", "Единый чек-лист передачи смены", true, 10);
  addNotif("u-mgr-it", "MV-0012", "INFO_REQUESTED", "Запрошена информация MV-0012", "Ожидайте лог от оператора склада", false, 25);
  addNotif("u-mgr-it", "MV-0011", "ASSIGNED", "Новое назначение MV-0011", "QR-допуск к инструктажам", true, 40);

  return {
    profiles,
    categories,
    requests,
    comments,
    history,
    notifications,
    attachments: [],
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
