-- ================================================================
-- 마이그레이션: routine_logs 테이블에 logged_at 컬럼 추가
-- 목적: 같은 날 동일 루틴을 여러 번 체크할 수 있도록 지원
--        (예: 혈압약 아침/저녁, 물 마시기 5회 각각 기록)
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

-- 1. logged_at 컬럼 추가 (없으면 추가)
ALTER TABLE routine_logs
  ADD COLUMN IF NOT EXISTS logged_at timestamptz DEFAULT now();

-- 2. 기존 레코드 logged_at 채우기 (NULL 방지)
UPDATE routine_logs
  SET logged_at = now()
  WHERE logged_at IS NULL;

-- 3. 기존 PK 제약 확인 및 다중 로그 지원을 위한 UNIQUE 완화
--    (routine_id + done_date 조합의 UNIQUE 제약이 있다면 제거)
--    아래는 제약명 확인 후 필요 시 실행:
-- ALTER TABLE routine_logs DROP CONSTRAINT IF EXISTS routine_logs_routine_id_done_date_key;

-- 4. 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date
  ON routine_logs (routine_id, done_date);

CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date
  ON routine_logs (user_id, done_date);
