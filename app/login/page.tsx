'use client';

/**
 * 노인복지관 어르신 돌봄 - 로그인 / 회원가입
 * 큰 글씨·높은 대비로 어르신이 편하게 쓰도록 구성
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          alert('회원가입에 실패했습니다.\n' + error.message);
        } else {
          alert('가입이 완료되었습니다.\n이메일을 확인하시거나 바로 로그인해 보세요.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          alert('로그인에 실패했습니다.\n이메일과 비밀번호를 다시 확인해 주세요.');
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      console.error('인증 오류:', err);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center px-6">

      <div className="text-center mb-10">
        <p className="text-7xl mb-4" aria-hidden>🏛️</p>
        <h1 className="text-4xl font-black text-emerald-900 mb-2 leading-tight">
          노인복지관<br />어르신 돌봄
        </h1>
        <p className="text-xl text-stone-600 font-bold">
          {isSignUp ? '복지관 서비스 이용을 위해 가입해 주세요' : '오늘 하루도 편안하시길 바랍니다'}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[40px] shadow-xl border border-stone-200 p-8 space-y-5">

        <div>
          <label className="block text-xl font-black text-stone-700 mb-3 ml-1">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 적어 주세요"
            className="w-full bg-stone-50 rounded-2xl px-5 py-5 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500 placeholder:text-stone-400"
            required
          />
        </div>

        <div>
          <label className="block text-xl font-black text-stone-700 mb-3 ml-1">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 적어 주세요"
            className="w-full bg-stone-50 rounded-2xl px-5 py-5 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500 placeholder:text-stone-400"
            required
          />
        </div>

        <button
          type="button"
          onClick={(e) => void handleAuth(e as unknown as React.FormEvent)}
          disabled={loading || !email || !password}
          className="w-full bg-emerald-700 text-white text-3xl font-black py-7 rounded-[28px] shadow-lg active:scale-[0.98] transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '잠시만요...' : (isSignUp ? '가입하기' : '들어가기')}
        </button>

      </div>

      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-8 text-2xl font-bold text-emerald-800 underline underline-offset-4 active:scale-[0.98]"
      >
        {isSignUp ? '이미 가입하셨나요? → 로그인' : '처음이신가요? → 회원가입'}
      </button>

    </div>
  );
};

export default LoginPage;
