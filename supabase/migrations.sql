-- ============================================================================
-- MODUS VOICE — Supabase migration
-- Полная схема: таблицы, RLS-политики, RPC.
--
-- Применение: Supabase Dashboard → SQL Editor → вставить файл
-- целиком и выполнить (Run). Или: supabase db push.
--
-- Адаптер lib/backends/supabase.ts рассчитывает ровно на эти объекты:
--   profiles, categories, requests (internal_id + request_code), comments,
--   status_history, notifications, attachments, RPC public_stats_v1,
--   create_user_v1, delete_user_v1.
--
-- ВАЖНО: для изменения структуры при включённом RLS используйте SQL Editor
-- под владельцем проекта (Postgres role "postgres" / dashboard SQL editor).
--
-- Демо-пользователи создаются вручную: Dashboard → Authentication →
-- Add user (confirmed=true), затем вставьте строки в profiles с тем же id
-- (см. блок «Демо-данные» внизу файла).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Расширения и служебные функции
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- Текущий профиль под auth.uid()
create or replace function public.auth_profile()
returns table (id uuid, role text, department text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.role, p.department
  from public.profiles p
  where p.id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 2. Справочник категорий
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  active      boolean not null default true,
  is_system   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Профили (расширение ДОМ auth.users — связь 1:1)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        text not null check (role in ('EMPLOYEE', 'MANAGER', 'ADMIN')),
  position    text not null default '',
  department  text not null default '',
  color       text not null default '#4f46e5',
  created_at  timestamptz not null default now()
);

alter table public.categories enable row level security;

-- ----------------------------------------------------------------------------
-- 4. Обращения
--
-- internal_id — настоящий FK-ключ (uuid), request_code — публичный номер
-- (MV-XXXX) для отображения и API-адресации адаптера.
-- ----------------------------------------------------------------------------
create sequence if not exists public.request_code_seq start 1;

create table if not exists public.requests (
  internal_id        uuid primary key default gen_random_uuid(),
  request_code       text unique not null,
  title              text not null,
  description        text not null,
  type               text not null check (type in ('IDEA', 'PROBLEM', 'SUGGESTION', 'PROCESS', 'OTHER')),
  category_id        uuid not null references public.categories (id) on update cascade,
  priority           text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status             text not null default 'NEW'
                     check (status in ('NEW', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'IMPLEMENTED')),
  author_id          uuid references public.profiles (id) on set null, -- null = анонимная отправка
  is_anonymous       boolean not null default false,
  assignee_id        uuid references public.profiles (id) on set null,
  possible_solution  text,
  decision           text,
  rejection_reason   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  due_date           timestamptz
);

create index if not exists requests_status_idx      on public.requests (status);
create index if not exists requests_assignee_idx    on public.requests (assignee_id);
create index if not exists requests_author_idx      on public.requests (author_id);
create index if not exists requests_category_idx    on public.requests (category_id);
create index if not exists requests_created_idx     on public.requests (created_at desc);

-- Генерация MV-0001… при вставке
create or replace function public.next_request_code()
returns trigger
language plpgsql
as $$
begin
  if new.request_code is null or new.request_code = '' then
    new.request_code := 'MV-' || lpad(nextval('public.request_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_next_request_code on public.requests;
create trigger trg_next_request_code
  before insert on public.requests
  for each row execute function public.next_request_code();

-- updated_at поддерживается триггером
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_requests on public.requests;
create trigger trg_touch_requests
  before update on public.requests
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Комментарии, история статусов, вложения
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (internal_id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  text        text not null,
  kind        text not null default 'message' check (kind in ('message', 'info_request', 'note')),
  created_at  timestamptz not null default now()
);
create index if not exists comments_request_idx on public.comments (request_id);

create table if not exists public.status_history (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (internal_id) on delete cascade,
  from_status text check (from_status in ('NEW', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'IMPLEMENTED')),
  to_status   text not null check (to_status in ('NEW', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'IMPLEMENTED')),
  changed_by  uuid references public.profiles (id) on set null,
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists status_history_request_idx on public.status_history (request_id);

create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (internal_id) on delete cascade,
  name        text not null,
  size        integer not null default 0,
  mime        text not null default 'application/octet-stream',
  data_url    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists attachments_request_idx on public.attachments (request_id);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  request_id  uuid references public.requests (internal_id) on delete set null,
  kind        text not null,
  title       text not null,
  body        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 6. Включение RLS
-- ----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.requests         enable row level security;
alter table public.comments         enable row level security;
alter table public.status_history   enable row level security;
alter table public.attachments      enable row level security;
alter table public.notifications    enable row level security;

-- ----------------------------------------------------------------------------
-- 7. Политики RLS
--
-- Модель доступа (совпадает с Demo Mode):
--   EMPLOYEE — только свои обращения (анонимные без author_id не видны
--              сотруднику в серверном режиме; автор видит их в Demo Mode);
--   MANAGER  — обращения своего отдела, назначенные ему и свои;
--   ADMIN    — всё.
-- ----------------------------------------------------------------------------

-- profiles: читать всех — авторизованным; менять — только себя или админа
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  )
  with check (
    id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

drop policy if exists profiles_delete_none on public.profiles;
-- удаление только через RPC delete_user_v1 (security definer)

-- requests
drop policy if exists requests_select_by_role on public.requests;
create policy requests_select_by_role on public.requests
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MANAGER')
      and (
        assignee_id = auth.uid()
        or author_id = auth.uid()
        or exists (
          select 1 from public.profiles me, public.profiles author
          where me.id = auth.uid()
            and author.id = requests.author_id
            and author.department = me.department
        )
      )
    )
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'EMPLOYEE')
      and author_id = auth.uid()
    )
  );

drop policy if exists requests_insert_authenticated on public.requests;
create policy requests_insert_authenticated on public.requests
  for insert to authenticated
  with check (
    is_anonymous = false or author_id is null or author_id = auth.uid()
  );

drop policy if exists requests_update_manage on public.requests;
create policy requests_update_manage on public.requests
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
    or assignee_id = auth.uid()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MANAGER')
      and (
        author_id = auth.uid()
        or exists (
          select 1 from public.profiles me, public.profiles author
          where me.id = auth.uid()
            and author.id = requests.author_id
            and author.department = me.department
        )
      )
    )
  );

-- comments: видны вместе с обращением
drop policy if exists comments_select_with_request on public.comments;
create policy comments_select_with_request on public.comments
  for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.internal_id = comments.request_id
        and (
          exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
          or r.assignee_id = auth.uid()
          or r.author_id = auth.uid()
          or (
            exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MANAGER')
            and exists (
              select 1 from public.profiles me, public.profiles author
              where me.id = auth.uid() and author.id = r.author_id and author.department = me.department
            )
          )
        )
    )
  );

drop policy if exists comments_insert_authenticated on public.comments;
create policy comments_insert_authenticated on public.comments
  for insert to authenticated with check (author_id = auth.uid());

-- status_history
drop policy if exists history_select_with_request on public.status_history;
create policy history_select_with_request on public.status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.internal_id = status_history.request_id
        and (
          exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
          or r.assignee_id = auth.uid()
          or r.author_id = auth.uid()
          or (
            exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MANAGER')
            and exists (
              select 1 from public.profiles me, public.profiles author
              where me.id = auth.uid() and author.id = r.author_id and author.department = me.department
            )
          )
        )
    )
  );

drop policy if exists history_insert_manage on public.status_history;
create policy history_insert_manage on public.status_history
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'MANAGER'))
  );

-- attachments
drop policy if exists attachments_select_with_request on public.attachments;
create policy attachments_select_with_request on public.attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.internal_id = attachments.request_id
        and (
          exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
          or r.assignee_id = auth.uid()
          or r.author_id = auth.uid()
          or (
            exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MANAGER')
            and exists (
              select 1 from public.profiles me, public.profiles author
              where me.id = auth.uid() and author.id = r.author_id and author.department = me.department
            )
          )
        )
    )
  );

drop policy if exists attachments_insert_authenticated on public.attachments;
create policy attachments_insert_authenticated on public.attachments
  for insert to authenticated with check (true);

-- notifications: строго по владельцу; вставлять может сервисный сценарий
-- (Adapter sendNotifications запросом пользователя). Разрешаем любому
-- аутентифицированному — только MVP-упрощение, для продакшена стоит
-- ограничить через security-definer RPC.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_insert_authenticated on public.notifications;
create policy notifications_insert_authenticated on public.notifications
  for insert to authenticated with check (true);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid());

-- categories: чтение — всем; запись — админам
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select to authenticated using (active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'
  ));

drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin on public.categories
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin on public.categories
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));

-- ----------------------------------------------------------------------------
-- 8. RPC-функции
-- ----------------------------------------------------------------------------

-- Публичная статистика (одинаково видна всем ролям)
create or replace function public.public_stats_v1()
returns table (
  total                 bigint,
  implemented           bigint,
  implementation_rate   numeric,
  avg_resolution_hours  numeric
)
language sql stable security definer set search_path = public
as $$
  select
    count(*)::bigint as total,
    count(*) filter (where r.status = 'IMPLEMENTED')::bigint as implemented,
    case when count(*) > 0
      then round(count(*) filter (where r.status = 'IMPLEMENTED') * 100.0 / count(*), 1)
      else 0 end as implementation_rate,
    coalesce(
      round(
        avg(
          extract(epoch from (r.resolved_at - r.created_at)) / 3600.0
        ) filter (where r.resolved_at is not null),
        1
      ), 0
    ) as avg_resolution_hours
  from public.requests r;
$$;

-- Создание пользователя администратором
-- (создаёт и auth-аккаунт, и профиль).
create or replace function public.create_user_v1(
  p_name       text,
  p_email      text,
  p_role       text,
  p_position   text default '',
  p_department text default ''
)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid;
  email_norm text := lower(trim(p_email));
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'Только администратор может создавать пользователей';
  end if;

  if not exists (select 1 from public.profiles where email = email_norm) then
    -- 1) создать auth-аккаунт с системным паролем (пользователь сменит через воссоздание)
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_confirm_status
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', email_norm,
      crypt('demo12345', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      now(), now(),
      '', '', '', '', 0
    )
    on conflict (email) do nothing
    returning id into uid;

    if uid is null then
      select a.id into uid from auth.users a where a.email = email_norm;
    end if;
  else
    raise exception 'Пользователь с таким e-mail уже существует';
  end if;

  -- 2) профиль
  insert into public.profiles (id, email, name, role, position, department)
  values (uid, email_norm, p_name, p_role, p_position, p_department);

  return (select * from public.profiles where id = uid);
end;
$$;

-- Удаление пользователя администратором (каскадно с auth-аккаунтом)
create or replace function public.delete_user_v1(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'Только администратор может удалять пользователей';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Нельзя удалить собственный аккаунт';
  end if;

  delete from auth.users where id = p_user_id;
  -- профиля удалится по каскаду (on delete cascade)
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. Системный набор категорий
-- ----------------------------------------------------------------------------
insert into public.categories (name, is_system, sort_order)
values
  ('Производство', true, 1),
  ('Логистика',    true, 2),
  ('Безопасность', true, 3),
  ('IT',           true, 4),
  ('Управление',   true, 5),
  ('HR',           true, 6),
  ('Другое',       true, 7)
on conflict do nothing;

alter table public.categories enable row level security;

-- ----------------------------------------------------------------------------
-- 10. Демо-данные
--
-- 1) Authentication → Add user (email + пароль, confirmed):
--      admin@modus.demo / employee@modus.demo / manager@modus.demo (пароль demo12345)
-- 2) Скопируйте id созданных пользователей сюда:
--
-- insert into public.profiles (id, email, name, role, position, department)
-- values
--   ('<admin-id>',    'admin@modus.demo',    'Аслан Мусин',     'ADMIN',    'Руководитель цифровых сервисов', 'Департамент IT'),
--   ('<manager-id>',  'manager@modus.demo',  'Елена Ковалёва',  'MANAGER',  'Руководитель логистики',         'Департамент логистики'),
--   ('<employee-id>', 'employee@modus.demo', 'Дмитрий Соколов', 'EMPLOYEE', 'Водитель-экспедитор 1 категории','Департамент логистики');
-- ============================================================================