-- ================================================================
-- 마이그레이션: 다중 로그 지원을 위한 routine_logs 테이블 수정
-- Supabase Dashboard > SQL Editor 에 아래 내용을 붙여넣고 Run 클릭
-- ================================================================

-- 1. unique 제약 제거 (같은 날 같은 루틴을 여러 번 체크 가능하게)
ALTER TABLE public.routine_logs
  DROP CONSTRAINT IF EXISTS routine_logs_routine_id_done_date_key;

-- 2. logged_at 컬럼 추가 (체크한 실제 시각 기록)
ALTER TABLE public.routine_logs
  ADD COLUMN IF NOT EXISTS logged_at timestamptz DEFAULT now();

-- 3. 기존 레코드 logged_at 채우기 (NULL 방지)
UPDATE public.routine_logs
  SET logged_at = created_at
  WHERE logged_at IS NULL;

-- 4. 조회 성능을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date
  ON public.routine_logs (routine_id, done_date);

CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date
  ON public.routine_logs (user_id, done_date);
