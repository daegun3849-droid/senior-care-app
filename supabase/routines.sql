-- routines 테이블: 매일 반복되는 루틴 항목
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  emoji text DEFAULT '✅',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- routine_logs 테이블: 날짜별 완료 기록
CREATE TABLE IF NOT EXISTS routine_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id uuid REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  done_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(routine_id, done_date)
);

-- RLS 활성화
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 접근
CREATE POLICY "본인 루틴만 접근" ON routines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "본인 루틴 로그만 접근" ON routine_logs FOR ALL USING (auth.uid() = user_id);
