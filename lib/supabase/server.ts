/**
 * 서버 컴포넌트용 Supabase 클라이언트
 * Server Component, Server Action, Route Handler에서 사용
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 쿠키 쓰기가 불가능합니다.
            // 미들웨어에서 세션을 갱신하고 있다면 이 오류는 무시해도 됩니다.
          }
        },
      },
    }
  );
};
