-- ============================================================
-- 어르신 돌봄 플래너 - Supabase 스키마
-- 새 Supabase 프로젝트에 이 SQL 전체를 붙여넣고 실행하세요
-- ============================================================


-- ============================================================
-- 1. users 테이블 (회원가입 시 자동 생성)
-- ============================================================
create table if not exists public.users (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: 본인만 조회"
  on public.users for select using (auth.uid() = id);

create policy "users: 본인만 수정"
  on public.users for update using (auth.uid() = id);

-- 회원가입 시 자동으로 users 행 삽입 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. todos 테이블 (일정 관리)
-- ============================================================
create table if not exists public.todos (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (id) on delete cascade,
  title        text        not null,
  description  text        default '',
  start_time   timestamptz not null default now(),
  end_time     timestamptz not null default now(),
  is_completed boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "todos: 본인만 조회"   on public.todos for select using (auth.uid() = user_id);
create policy "todos: 본인만 추가"   on public.todos for insert with check (auth.uid() = user_id);
create policy "todos: 본인만 수정"   on public.todos for update using (auth.uid() = user_id);
create policy "todos: 본인만 삭제"   on public.todos for delete using (auth.uid() = user_id);

create index if not exists idx_todos_user_id   on public.todos (user_id);
create index if not exists idx_todos_start     on public.todos (start_time);


-- ============================================================
-- 3. routines 테이블 (건강 체크 항목)
-- ============================================================
create table if not exists public.routines (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.users (id) on delete cascade,
  title            text        not null,
  emoji            text        not null default '✅',
  sort_order       integer     not null default 0,
  routine_time     text,
  routine_end_time text,
  created_at       timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "routines: 본인만 조회"  on public.routines for select using (auth.uid() = user_id);
create policy "routines: 본인만 추가"  on public.routines for insert with check (auth.uid() = user_id);
create policy "routines: 본인만 수정"  on public.routines for update using (auth.uid() = user_id);
create policy "routines: 본인만 삭제"  on public.routines for delete using (auth.uid() = user_id);


-- ============================================================
-- 4. routine_logs 테이블 (오늘 건강 체크 기록)
-- ============================================================
create table if not exists public.routine_logs (
  id          uuid        primary key default gen_random_uuid(),
  routine_id  uuid        not null references public.routines (id) on delete cascade,
  user_id     uuid        not null references public.users (id) on delete cascade,
  done_date   date        not null,
  created_at  timestamptz not null default now(),
  unique (routine_id, done_date)
);

alter table public.routine_logs enable row level security;

create policy "routine_logs: 본인만 조회"  on public.routine_logs for select using (auth.uid() = user_id);
create policy "routine_logs: 본인만 추가"  on public.routine_logs for insert with check (auth.uid() = user_id);
create policy "routine_logs: 본인만 삭제"  on public.routine_logs for delete using (auth.uid() = user_id);
