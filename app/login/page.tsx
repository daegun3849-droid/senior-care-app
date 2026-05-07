'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // 로그인/회원가입 전환용
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // 회원가입
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert('회원가입 실패: ' + error.message);
      else alert('가입 확인 이메일을 확인하거나 로그인을 시도하세요!');
    } else {
      // 로그인
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('로그인 실패: ' + error.message);
      else router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl border border-white">
        <h1 className="text-3xl font-black italic text-emerald-600 text-center mb-2">AI-PLANNER</h1>
        <p className="text-center text-slate-400 text-sm font-bold mb-10 tracking-widest">SMART SCHEDULER</p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 ml-4">EMAIL ADDRESS</span>
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
              placeholder="example@email.com"
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
              required 
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 ml-4">PASSWORD</span>
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
              required 
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all mt-4 hover:bg-emerald-600"
          >
            {loading ? '처리 중...' : (isSignUp ? '무료로 가입하기' : '로그인하기')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-slate-400 underline underline-offset-4"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 회원가입'}
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] font-bold text-slate-300">© 2026 AI-PLANNER ARCHITECT PRO</p>
    </div>
  );
}