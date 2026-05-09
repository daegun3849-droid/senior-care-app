"use client";

/**
 * 보호자·요양보호사 전용 읽기 뷰
 * 어르신 userId를 URL에 포함해 공유 → 오늘 건강체크·일정을 읽기 전용으로 표시
 */

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase/client";

interface HealthCheck { id: string; title: string; emoji: string; sort_order: number; routine_time: string | null; }
interface HealthLog   { routine_id: string; done_date: string; logged_at: string | null; }
interface Schedule    { id: string; content: string; start_time: string; end_time: string; is_completed: boolean; }

const CATEGORY_RANGES = [
  { label: "💊 복약",     from:  0, to:  2 },
  { label: "🍽️ 식사",     from:  3, to:  5 },
  { label: "🩺 활력징후", from:  6, to:  9 },
  { label: "💧 수분 섭취", from: 10, to: 14 },
  { label: "🚶 활동",     from: 15, to: 17 },
  { label: "🪥 위생",     from: 18, to: 20 },
  { label: "💛 기타",     from: 21, to: 99 },
];

const CaregiverPage = ({ params }: { params: Promise<{ userId: string }> }) => {
  const { userId } = use(params);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [checks, setChecks]     = useState<HealthCheck[]>([]);
  const [logs, setLogs]         = useState<HealthLog[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const now = new Date();
  const days = ["일","월","화","수","목","금","토"];
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const [{ data: r }, { data: l }, { data: s }] = await Promise.all([
          supabase.from("routines").select("*").eq("user_id", userId).order("sort_order"),
          supabase.from("routine_logs").select("routine_id, done_date, logged_at")
            .eq("user_id", userId).eq("done_date", todayStr),
          supabase.from("todos").select("id, content, start_time, end_time, is_completed")
            .eq("user_id", userId).gte("start_time", `${todayStr}T00:00:00`).lte("start_time", `${todayStr}T23:59:59`)
            .order("start_time"),
        ]);
        setChecks((r ?? []) as HealthCheck[]);
        setLogs((l ?? []) as HealthLog[]);
        setSchedules((s ?? []) as Schedule[]);
      } catch {
        setError("정보를 불러올 수 없습니다. 링크를 다시 확인해 주세요.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId, todayStr]);

  const doneCount  = new Set(logs.map((l) => l.routine_id)).size;
  const totalCount = checks.length;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <p className="text-2xl font-black text-stone-500">불러오는 중…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <p className="text-2xl font-black text-stone-700">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 pb-12">
      {/* 헤더 */}
      <header className="bg-emerald-800 text-white px-5 py-5 sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto">
          <p className="text-sm font-bold opacity-70">보호자·요양보호사 전용 보기</p>
          <h1 className="text-2xl font-black">어르신 오늘 건강 현황</h1>
          <p className="text-lg font-bold opacity-80 mt-0.5">{dateLabel}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* 오늘 완료율 요약 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm">
          <p className="text-lg font-bold text-stone-500 mb-1">오늘 건강 체크 완료율</p>
          <p className="text-5xl font-black text-emerald-800 mb-3">
            {pct}%
            <span className="text-2xl text-stone-400 font-bold ml-2">
              ({doneCount}/{totalCount})
            </span>
          </p>
          <div className="w-full bg-stone-100 rounded-full h-5">
            <div
              className="bg-emerald-600 h-5 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="mt-3 text-xl font-black text-emerald-700">
              🎉 오늘 모든 체크를 완료하셨어요!
            </p>
          )}
        </section>

        {/* 카테고리별 건강 체크 현황 */}
        <section className="bg-white rounded-[24px] p-5 shadow-sm">
          <p className="text-xl font-black text-stone-800 mb-4">건강·복약 체크 현황</p>
          <div className="space-y-4">
            {CATEGORY_RANGES.map((cat) => {
              const items = checks.filter((c) => c.sort_order >= cat.from && c.sort_order <= cat.to);
              if (items.length === 0) return null;
              const catDone = items.filter((c) => logs.some((l) => l.routine_id === c.id)).length;
              return (
                <div key={cat.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-base font-black text-stone-500">{cat.label}</p>
                    <span className={`text-sm font-black px-2 py-0.5 rounded-full ${
                      catDone === items.length ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"
                    }`}>
                      {catDone}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((check) => {
                      const isDone = logs.some((l) => l.routine_id === check.id);
                      const logCount = logs.filter((l) => l.routine_id === check.id).length;
                      return (
                        <div key={check.id}
                          className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                            isDone ? "bg-emerald-600 text-white" : "bg-stone-50 border border-stone-200"
                          }`}
                        >
                          <span className="text-2xl">{check.emoji}</span>
                          <span className={`text-lg font-black flex-1 ${isDone ? "text-white" : "text-stone-800"}`}>
                            {check.title}
                          </span>
                          {logCount > 1 && (
                            <span className="text-xs font-black bg-white/30 text-white px-2 py-0.5 rounded-full">
                              {logCount}회
                            </span>
                          )}
                          <span className={`text-base font-bold ${isDone ? "text-emerald-100" : "text-stone-400"}`}>
                            {isDone ? "✓ 완료" : (check.routine_time ?? "미완료")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 오늘 일정 */}
        <section className="bg-white rounded-[24px] p-5 shadow-sm">
          <p className="text-xl font-black text-stone-800 mb-4">오늘 복지관·병원 일정</p>
          {schedules.length === 0 ? (
            <p className="text-lg text-stone-400 text-center py-4">오늘 등록된 일정이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    s.is_completed ? "bg-stone-100" : "bg-blue-50 border border-blue-100"
                  }`}
                >
                  <span className="text-xl">{s.is_completed ? "✅" : "📋"}</span>
                  <div className="flex-1">
                    <p className={`text-lg font-black ${s.is_completed ? "text-stone-400 line-through" : "text-stone-800"}`}>
                      {s.content}
                    </p>
                    <p className="text-sm text-stone-400">
                      {new Date(s.start_time).toLocaleTimeString("ko-KR", {
                        hour: "2-digit", minute: "2-digit", hour12: false,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 안내 */}
        <p className="text-center text-sm text-stone-400 font-bold px-4">
          이 페이지는 보호자·요양보호사 전용 읽기 전용 뷰입니다.
          어르신 본인의 기기에서만 체크 수정이 가능합니다.
        </p>
      </main>
    </div>
  );
};

export default CaregiverPage;
