-- ============================================================
-- AI Todo Manager - Database Schema
-- Supabase (PostgreSQL) 전용
-- ============================================================


-- ============================================================
-- 1. ENUM 타입
-- ============================================================

create type public.priority_level as enum ('high', 'medium', 'low');


-- ============================================================
-- 2. public.users
--    auth.users와 1:1로 연결되는 사용자 프로필 테이블
--    Supabase Auth가 회원가입 시 자동으로 행을 삽입하도록
--    트리거와 함께 사용됩니다.
-- ============================================================

create table public.users (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table public.users enable row level security;

-- 본인 행만 조회 가능
create policy "users: 본인만 조회"
  on public.users
  for select
  using (auth.uid() = id);

-- 본인 행만 수정 가능
create policy "users: 본인만 수정"
  on public.users
  for update
  using (auth.uid() = id);

-- ============================================================
-- 3. 신규 회원가입 시 public.users에 자동으로 행 삽입하는 트리거
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 4. public.todos
--    각 사용자(user_id)별 할 일 관리 테이블
-- ============================================================

create table public.todos (
  id           uuid            primary key default gen_random_uuid(),
  user_id      uuid            not null references public.users (id) on delete cascade,
  title        text            not null,
  description  text,
  created_date timestamptz     not null default now(),
  due_date     timestamptz,
  priority     priority_level  not null default 'medium',
  category     text[]          not null default '{}',
  completed    boolean         not null default false,
  ai_summary   text
);

-- RLS 활성화
alter table public.todos enable row level security;

-- 본인 할 일만 조회 가능
create policy "todos: 본인만 조회"
  on public.todos
  for select
  using (auth.uid() = user_id);

-- 본인 할 일만 추가 가능 (user_id가 반드시 본인이어야 함)
create policy "todos: 본인만 추가"
  on public.todos
  for insert
  with check (auth.uid() = user_id);

-- 본인 할 일만 수정 가능
create policy "todos: 본인만 수정"
  on public.todos
  for update
  using (auth.uid() = user_id);

-- 본인 할 일만 삭제 가능
create policy "todos: 본인만 삭제"
  on public.todos
  for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 5. 인덱스
--    PRD 기준: user_id, due_date, priority
-- ============================================================

create index idx_todos_user_id  on public.todos (user_id);
create index idx_todos_due_date on public.todos (due_date);
create index idx_todos_priority on public.todos (priority);

-- ============================================================
-- 6. 기존 DB에 컬럼 추가 (신규 설치 시 불필요)
-- ============================================================

-- alter table public.todos add column if not exists ai_summary text;
-- alter table public.todos add column if not exists start_date timestamptz;


-- title + description 전문 검색(Full-Text Search)용 인덱스
create index idx_todos_fts
  on public.todos
  using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  );
