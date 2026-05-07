-- routines 테이블에 시간 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE routines ADD COLUMN IF NOT EXISTS routine_time text;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS routine_end_time text;
