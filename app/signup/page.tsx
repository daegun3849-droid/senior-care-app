"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert("회원가입 에러: " + error.message);
    } else {
      alert("회원가입 성공! 로그인을 진행해 주세요.");
      router.push("/login"); // 성공 시 로그인 페이지로 이동
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">🎁 새 계정 만들기</h1>
        
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">이메일 주소</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">비밀번호</label>
            <input
              type="password"
              placeholder="6자리 이상 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-medium p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400 mt-2"
          >
            {loading ? "가입 중..." : "회원가입 완료"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">이미 계정이 있으신가요?</span>{" "}
          <Link href="/login" className="text-blue-600 font-bold underline">로그인하기</Link>
        </div>
      </div>
    </main>
  );
}