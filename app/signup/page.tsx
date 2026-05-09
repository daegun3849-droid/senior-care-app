"use client";

/**
 * 노인복지관 어르신 돌봄 - 회원가입 (큰 글씨)
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        alert("회원가입에 실패했습니다.\n" + error.message);
      } else {
        alert("가입이 완료되었습니다.\n로그인 화면에서 들어가 주세요.");
        router.push("/login");
      }
    } catch (err) {
      console.error("회원가입 오류:", err);
      alert("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-stone-100 py-10">
      <div className="text-center mb-8">
        <p className="text-6xl mb-3" aria-hidden>🏛️</p>
        <h1 className="text-3xl font-black text-emerald-900 leading-tight">
          노인복지관<br />어르신 돌봄
        </h1>
        <p className="text-xl font-bold text-stone-600 mt-2">새 계정 만들기</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[36px] shadow-xl border border-stone-200 p-8">
        <form onSubmit={(e) => void handleSignup(e)} className="flex flex-col gap-5">
          <div>
            <label className="block text-xl font-black text-stone-700 mb-2">이메일</label>
            <input
              type="email"
              placeholder="이메일을 적어 주세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-xl font-bold text-stone-900 border-2 border-stone-200 focus:border-emerald-500 outline-none placeholder:text-stone-400"
              required
            />
          </div>
          <div>
            <label className="block text-xl font-black text-stone-700 mb-2">비밀번호</label>
            <input
              type="password"
              placeholder="6자리 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-xl font-bold text-stone-900 border-2 border-stone-200 focus:border-emerald-500 outline-none placeholder:text-stone-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 text-white text-2xl font-black py-6 rounded-[28px] shadow-lg active:scale-[0.98] disabled:opacity-40 mt-2"
          >
            {loading ? "처리 중..." : "가입 완료"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/login" className="text-xl font-bold text-emerald-800 underline underline-offset-4">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
};

export default SignupPage;
