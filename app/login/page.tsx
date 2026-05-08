'use client';

/**
 * 어르신 돌봄 플래너 - 로그인 / 회원가입 페이지
 * 큰 글씨, 단순한 UI
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
          alert('가입 완료! 이메일을 확인하거나 바로 로그인해 보세요.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          alert('로그인에 실패했습니다.\n이메일과 비밀번호를 확인해 주세요.');
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      console.error('인증 오류:', err);
      alert('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center px-6">

      <div className="text-center mb-10">
        <p className="text-7xl mb-4">🌸</p>
        <h1 className="text-4xl font-black text-sky-700 mb-2">어르신 돌봄 플래너</h1>
        <p className="text-xl text-slate-500">
          {isSignUp ? '처음 오셨나요? 가입해 주세요' : '반갑습니다! 로그인해 주세요'}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 space-y-5">

        <div>
          <label className="block text-xl font-black text-slate-600 mb-3 ml-1">
            📧 이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소 입력"
            className="w-full bg-sky-50 rounded-2xl px-5 py-5 text-2xl font-bold text-slate-800 outline-none border-2 border-transparent focus:border-sky-300 placeholder:text-slate-300"
            required
          />
        </div>

        <div>
          <label className="block text-xl font-black text-slate-600 mb-3 ml-1">
            🔑 비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full bg-sky-50 rounded-2xl px-5 py-5 text-2xl font-bold text-slate-800 outline-none border-2 border-transparent focus:border-sky-300 placeholder:text-slate-300"
            required
          />
        </div>

        <button
          type="button"
          onClick={(e) => void handleAuth(e as unknown as React.FormEvent)}
          disabled={loading || !email || !password}
          className="w-full bg-sky-500 text-white text-3xl font-black py-7 rounded-[28px] shadow-xl active:scale-95 transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : (isSignUp ? '가입하기' : '로그인하기')}
        </button>

      </div>

      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-8 text-2xl font-bold text-sky-600 underline underline-offset-4 active:scale-95"
      >
        {isSignUp ? '이미 계정이 있으신가요? → 로그인' : '처음이신가요? → 회원가입'}
      </button>

    </div>
  );
};

export default LoginPage;
