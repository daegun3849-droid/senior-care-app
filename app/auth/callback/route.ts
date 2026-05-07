/**
 * Supabase 이메일 인증 콜백 라우트 핸들러
 * 이메일 확인 링크 클릭 시 code를 세션으로 교환하고 메인 페이지로 이동
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const GET = async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}/login`);
      }

      console.error('세션 교환 실패:', error.message);
    } catch (err) {
      console.error('콜백 처리 오류:', err);
    }
  }

  // 오류 발생 시 로그인 페이지로 이동
  return NextResponse.redirect(`${origin}/login?error=인증에 실패했습니다. 다시 시도해 주세요.`);
};
