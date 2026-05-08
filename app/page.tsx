"use client";

/**
 * 어르신 돌봄 플래너 - 메인 페이지
 * 큰 글씨, 간단한 UI, 음성 입력 지원
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import confetti from "canvas-confetti";

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

interface HealthCheck {
  id: string;
  title: string;
  emoji: string;
  sort_order: number;
  routine_time: string | null;
}

interface HealthLog {
  routine_id: string;
  done_date: string;
}

const DEFAULT_HEALTH_CHECKS = [
  { emoji: "💊", title: "혈압약", routine_time: "08:00" },
  { emoji: "🩸", title: "당뇨약", routine_time: "08:30" },
  { emoji: "🩺", title: "혈압 측정", routine_time: "09:00" },
  { emoji: "🍚", title: "식사 챙기기", routine_time: "12:00" },
  { emoji: "🚶", title: "산책·운동", routine_time: "10:00" },
  { emoji: "💧", title: "물 마시기", routine_time: "15:00" },
];

const getDateParts = () => {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    date: `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`,
    year: `${now.getFullYear()}년`,
  };
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "좋은 아침이에요! 🌅";
  if (h < 18) return "좋은 오후예요! ☀️";
  return "좋은 저녁이에요! 🌙";
};

const formatScheduleTime = (isoStr: string) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${month}월 ${day}일 ${ampm} ${h12}시${minute !== "00" ? ` ${minute}분` : ""}`;
};

const addOneHour = (dateStr: string, timeStr: string): string => {
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  dt.setHours(dt.getHours() + 1);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
};

const SeniorCarePage = () => {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);

  const [activeTab, setActiveTab] = useState<"home" | "schedule" | "add">("home");
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const { date: todayDate, year: todayYear } = getDateParts();

  const fetchSchedules = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: true });
      if (data) setSchedules(data as Schedule[]);
    } catch (e) {
      console.error("일정 조회 실패:", e);
    }
  }, []);

  const fetchHealthChecks = useCallback(async (userId: string) => {
    try {
      const { data: rData } = await supabase
        .from("routines")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (rData && rData.length > 0) {
        setHealthChecks(rData as HealthCheck[]);
      } else {
        await insertDefaultHealthChecks(userId);
      }

      const { data: lData } = await supabase
        .from("routine_logs")
        .select("routine_id, done_date")
        .eq("user_id", userId)
        .eq("done_date", todayStr);
      if (lData) setHealthLogs(lData as HealthLog[]);
    } catch (e) {
      console.error("건강 체크 조회 실패:", e);
    }
  }, [todayStr]);

  const insertDefaultHealthChecks = async (userId: string) => {
    const inserts = DEFAULT_HEALTH_CHECKS.map((item, i) => ({
      user_id: userId,
      title: item.title,
      emoji: item.emoji,
      sort_order: i,
      routine_time: item.routine_time,
      routine_end_time: null,
    }));
    const { data: inserted } = await supabase.from("routines").insert(inserts).select();
    if (inserted) setHealthChecks(inserted as HealthCheck[]);
  };

  const handleResetHealthChecks = async () => {
    if (!user) return;
    try {
      await supabase.from("routine_logs").delete().eq("user_id", user.id);
      await supabase.from("routines").delete().eq("user_id", user.id);
      setHealthLogs([]);
      setHealthChecks([]);
      await insertDefaultHealthChecks(user.id);
      setShowResetConfirm(false);
    } catch (e) {
      console.error("건강 체크 초기화 실패:", e);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ id: u.id, email: u.email });
        void fetchSchedules(u.id);
        void fetchHealthChecks(u.id);
      }
      setAuthLoaded(true);
    });
  }, [fetchSchedules, fetchHealthChecks]);

  const handleToggleHealth = async (checkId: string) => {
    if (!user) return;
    const isDone = healthLogs.some((l) => l.routine_id === checkId && l.done_date === todayStr);
    try {
      if (isDone) {
        await supabase
          .from("routine_logs")
          .delete()
          .eq("routine_id", checkId)
          .eq("done_date", todayStr);
        setHealthLogs((prev) =>
          prev.filter((l) => !(l.routine_id === checkId && l.done_date === todayStr))
        );
      } else {
        await supabase
          .from("routine_logs")
          .insert({ routine_id: checkId, user_id: user.id, done_date: todayStr });
        setHealthLogs((prev) => [...prev, { routine_id: checkId, done_date: todayStr }]);

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

        if ("speechSynthesis" in window) {
          const check = healthChecks.find((c) => c.id === checkId);
          if (check) {
            const utter = new SpeechSynthesisUtterance(`${check.title} 완료!`);
            utter.lang = "ko-KR";
            utter.rate = 0.85;
            window.speechSynthesis.speak(utter);
          }
        }
      }
    } catch (e) {
      console.error("건강 체크 토글 실패:", e);
    }
  };

  const handleToggleSchedule = async (schedule: Schedule) => {
    const completing = !schedule.is_completed;
    await supabase.from("todos").update({ is_completed: completing }).eq("id", schedule.id);
    if (completing) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(`${schedule.title} 완료했습니다!`);
        utter.lang = "ko-KR";
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    }
    if (user?.id) await fetchSchedules(user.id);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("이 일정을 삭제할까요?")) return;
    await supabase.from("todos").delete().eq("id", id);
    if (user?.id) await fetchSchedules(user.id);
  };

  const handleVoiceInput = () => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      alert("이 기기에서는 음성 입력을 지원하지 않습니다.\n직접 입력창에 써 주세요.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = (window.SpeechRecognition || window.webkitSpeechRecognition) as typeof SpeechRecognition;
    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      setActiveTab("add");
      setNewTitle(transcript);
      setIsParsingVoice(true);
      try {
        const res = await fetch("/api/ai-parse-todo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: transcript }),
        });
        const result = await res.json() as Array<{ title: string; desc: string; start: string; end: string }>;
        if (Array.isArray(result) && result.length > 0) {
          const item = result[0];
          setNewTitle(item.title || transcript);
          if (item.start) {
            const d = new Date(item.start);
            if (!isNaN(d.getTime())) {
              setNewDate(d.toISOString().slice(0, 10));
              setNewTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
            }
          }
        }
      } catch (e) {
        console.error("AI 파싱 실패:", e);
      } finally {
        setIsParsingVoice(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      alert("음성을 인식하지 못했습니다. 다시 시도해 주세요.");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSaveSchedule = async () => {
    if (!newTitle.trim()) {
      alert("일정 제목을 입력해 주세요.");
      return;
    }
    if (!user?.id) {
      alert("로그인이 필요합니다.");
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date();
      const startDt = newDate && newTime
        ? `${newDate}T${newTime}:00`
        : now.toISOString();
      const endDt = newDate && newTime
        ? addOneHour(newDate, newTime)
        : new Date(now.getTime() + 3600000).toISOString();

      const { error } = await supabase.from("todos").insert([{
        title: newTitle.trim(),
        description: "",
        start_time: startDt,
        end_time: endDt,
        user_id: user.id,
        is_completed: false,
      }]);
      if (error) throw new Error(error.message);

      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(`${newTitle.trim()} 일정이 저장되었습니다.`);
        utter.lang = "ko-KR";
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }

      setNewTitle("");
      setNewDate("");
      setNewTime("");
      setVoiceText("");
      await fetchSchedules(user.id);
      setActiveTab("schedule");
    } catch (e) {
      console.error("일정 저장 실패:", e);
      alert(`저장에 실패했습니다.\n${e instanceof Error ? e.message : "다시 시도해 주세요."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const todaySchedules = schedules.filter((s) => {
    const d = new Date(s.start_time);
    return d.toISOString().slice(0, 10) === todayStr;
  });

  const doneCount = healthLogs.filter((l) => l.done_date === todayStr).length;
  const totalCount = healthChecks.length;

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <p className="text-3xl font-bold text-sky-600 animate-pulse">잠시만요...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10">
          <p className="text-7xl mb-4">🌸</p>
          <h1 className="text-4xl font-black text-sky-700 mb-3">어르신 돌봄 플래너</h1>
          <p className="text-xl text-slate-500">건강하고 즐거운 하루를 함께해요</p>
        </div>
        <button
          type="button"
          onClick={() => { window.location.href = "/login"; }}
          className="w-full max-w-sm bg-sky-500 text-white text-3xl font-black py-8 rounded-[32px] shadow-2xl active:scale-95 transition-all"
        >
          시작하기
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = "/signup"; }}
          className="mt-6 text-xl font-bold text-sky-600 underline underline-offset-4"
        >
          처음이신가요? 회원가입
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* 상단 헤더 */}
      <header className="bg-white px-5 pt-7 pb-5 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-bold text-sky-500 leading-tight">{getGreeting()}</p>
            <p className="text-lg font-bold text-slate-400 leading-tight">{todayYear}</p>
            <p className="text-3xl font-black text-slate-800 leading-tight mt-0.5">{todayDate}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              supabase.auth.signOut().then(() => { window.location.href = "/login"; })
            }
            className="bg-slate-100 text-slate-500 text-lg font-bold px-5 py-3 rounded-2xl active:scale-95 shrink-0 ml-3"
          >
            나가기
          </button>
        </div>
      </header>

      {/* 탭 콘텐츠 */}
      <main className="flex-1 overflow-y-auto pb-36">

        {/* ── 홈 탭 ── */}
        {activeTab === "home" && (
          <div className="px-4 pt-5 space-y-5">

            {/* 오늘 건강 체크 */}
            <section className="bg-white rounded-[28px] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-black text-slate-700">오늘의 건강 체크</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-sky-600 bg-sky-100 px-4 py-1.5 rounded-full">
                    {doneCount}/{totalCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-xl active:scale-95"
                    title="항목 초기화"
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* 진행 바 */}
              <div className="w-full bg-slate-100 rounded-full h-4 mb-4">
                <div
                  className="bg-sky-400 h-4 rounded-full transition-all duration-700"
                  style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
                />
              </div>

              {doneCount === totalCount && totalCount > 0 && (
                <p className="text-center text-xl font-black text-sky-600 mb-3">
                  🎉 오늘 건강 체크 모두 완료!
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {healthChecks.map((check) => {
                  const isDone = healthLogs.some(
                    (l) => l.routine_id === check.id && l.done_date === todayStr
                  );
                  return (
                    <button
                      key={check.id}
                      type="button"
                      onClick={() => void handleToggleHealth(check.id)}
                      className={`relative flex flex-col items-center justify-center py-7 rounded-[24px] transition-all active:scale-95 select-none ${
                        isDone
                          ? "bg-sky-500 shadow-lg shadow-sky-200"
                          : "bg-sky-50 border-2 border-sky-100"
                      }`}
                    >
                      {isDone && (
                        <span className="absolute top-2 right-3 text-xl">✅</span>
                      )}
                      <span className="text-5xl mb-2">{check.emoji}</span>
                      <span className={`text-xl font-black text-center leading-tight px-1 ${isDone ? "text-white" : "text-slate-700"}`}>
                        {check.title}
                      </span>
                      {check.routine_time && (
                        <span className={`text-base font-bold mt-1 ${isDone ? "text-sky-100" : "text-slate-400"}`}>
                          {check.routine_time}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 오늘 일정 */}
            <section>
              <h2 className="text-2xl font-black text-slate-700 mb-3 px-1">오늘 일정</h2>
              {todaySchedules.length === 0 ? (
                <div className="bg-white rounded-[24px] p-8 text-center shadow-sm">
                  <p className="text-5xl mb-3">📅</p>
                  <p className="text-xl font-bold text-slate-400">오늘 일정이 없어요</p>
                  <p className="text-lg text-slate-300 mt-1">아래 말하기 버튼으로 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedules.map((s) => (
                    <div
                      key={s.id}
                      className={`bg-white rounded-[24px] p-5 flex items-center gap-4 shadow-sm ${
                        s.is_completed ? "opacity-60" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void handleToggleSchedule(s)}
                        className={`w-14 h-14 rounded-full border-4 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                          s.is_completed
                            ? "bg-sky-500 border-sky-500"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {s.is_completed && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-2xl font-black truncate ${s.is_completed ? "line-through text-slate-300" : "text-slate-800"}`}>
                          {s.title}
                        </p>
                        <p className="text-lg font-bold text-sky-500 mt-0.5">
                          {formatScheduleTime(s.start_time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── 일정 탭 ── */}
        {activeTab === "schedule" && (
          <div className="px-4 pt-5 space-y-3">
            <h2 className="text-2xl font-black text-slate-700 mb-1">전체 일정</h2>
            {schedules.length === 0 ? (
              <div className="bg-white rounded-[24px] p-10 text-center shadow-sm">
                <p className="text-5xl mb-3">📋</p>
                <p className="text-xl font-bold text-slate-400">등록된 일정이 없어요</p>
              </div>
            ) : (
              schedules.map((s) => {
                const isPast = new Date(s.start_time) < new Date() && !s.is_completed;
                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-[24px] p-5 shadow-sm ${isPast ? "border-l-4 border-rose-400" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void handleToggleSchedule(s)}
                        className={`w-14 h-14 rounded-full border-4 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                          s.is_completed ? "bg-sky-500 border-sky-500" : "border-slate-300 bg-white"
                        }`}
                      >
                        {s.is_completed && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-2xl font-black truncate ${s.is_completed ? "line-through text-slate-300" : isPast ? "text-rose-500" : "text-slate-800"}`}>
                          {s.title}
                        </p>
                        <p className={`text-lg font-bold mt-0.5 ${isPast && !s.is_completed ? "text-rose-400" : "text-sky-500"}`}>
                          {formatScheduleTime(s.start_time)}
                          {isPast && !s.is_completed && " ⚠️"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSchedule(s.id)}
                        className="w-12 h-12 flex items-center justify-center text-2xl text-slate-300 active:text-rose-400 active:scale-90 transition-all flex-shrink-0"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── 일정 추가 탭 ── */}
        {activeTab === "add" && (
          <div className="px-4 pt-5 space-y-4">
            <h2 className="text-2xl font-black text-slate-700">일정 추가</h2>

            {voiceText && (
              <div className="bg-sky-50 border-2 border-sky-200 rounded-[24px] p-5">
                <p className="text-lg font-bold text-sky-600 mb-1">🎤 말씀하신 내용</p>
                <p className="text-xl font-bold text-slate-700">&ldquo;{voiceText}&rdquo;</p>
                {isParsingVoice && (
                  <p className="text-lg text-sky-400 mt-2 animate-pulse">날짜·시간 분석 중...</p>
                )}
              </div>
            )}

            <div className="bg-white rounded-[24px] p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-xl font-black text-slate-600 mb-2">📝 일정 이름</label>
                <input
                  className="w-full bg-sky-50 rounded-2xl px-4 py-4 text-2xl font-bold text-slate-800 outline-none border-2 border-transparent focus:border-sky-300 placeholder:text-slate-300"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 병원 진료, 복지관"
                />
              </div>

              <div>
                <label className="block text-xl font-black text-slate-600 mb-2">📅 날짜</label>
                <input
                  type="date"
                  className="w-full bg-sky-50 rounded-2xl px-4 py-4 text-2xl font-bold text-slate-800 outline-none border-2 border-transparent focus:border-sky-300"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xl font-black text-slate-600 mb-2">⏰ 시간</label>
                <input
                  type="time"
                  className="w-full bg-sky-50 rounded-2xl px-4 py-4 text-2xl font-bold text-slate-800 outline-none border-2 border-transparent focus:border-sky-300"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveSchedule()}
              disabled={!newTitle.trim() || isSaving}
              className="w-full bg-sky-500 text-white text-3xl font-black py-7 rounded-[32px] shadow-xl active:scale-95 transition-all disabled:opacity-40"
            >
              {isSaving ? "저장 중..." : "일정 저장 ✅"}
            </button>

            <button
              type="button"
              onClick={() => { setNewTitle(""); setNewDate(""); setNewTime(""); setVoiceText(""); }}
              className="w-full bg-slate-100 text-slate-500 text-xl font-bold py-5 rounded-[24px] active:scale-95 transition-all"
            >
              다시 입력하기
            </button>
          </div>
        )}

      </main>

      {/* 건강 체크 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm shadow-2xl">
            <p className="text-2xl font-black text-slate-800 mb-2">건강 체크 초기화</p>
            <p className="text-lg text-slate-500 mb-6 leading-relaxed">
              기존 항목을 모두 지우고<br />어르신 기본 항목으로 바꿀까요?<br />
              <span className="text-sky-600 font-bold">(혈압약, 당뇨약, 혈압측정, 식사, 산책, 물 마시기)</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleResetHealthChecks()}
                className="flex-1 bg-sky-500 text-white text-xl font-black py-5 rounded-2xl active:scale-95"
              >
                네, 바꿀게요
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-slate-100 text-slate-500 text-xl font-bold py-5 rounded-2xl active:scale-95"
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-2xl" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="flex items-center justify-around px-4 py-3">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl transition-all active:scale-95 ${activeTab === "home" ? "bg-sky-50" : ""}`}
          >
            <span className="text-4xl">🏠</span>
            <span className={`text-lg font-black ${activeTab === "home" ? "text-sky-600" : "text-slate-400"}`}>홈</span>
          </button>

          <button
            type="button"
            onClick={handleVoiceInput}
            className={`flex flex-col items-center justify-center w-24 h-24 rounded-full shadow-2xl transition-all active:scale-95 -mt-8 ${
              isListening ? "bg-rose-500 animate-pulse shadow-rose-300" : "bg-sky-500 shadow-sky-200"
            }`}
          >
            <span className="text-4xl">{isListening ? "🛑" : "🎤"}</span>
            <span className="text-base font-black text-white">{isListening ? "멈추기" : "말하기"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl transition-all active:scale-95 ${activeTab === "schedule" ? "bg-sky-50" : ""}`}
          >
            <span className="text-4xl">📋</span>
            <span className={`text-lg font-black ${activeTab === "schedule" ? "text-sky-600" : "text-slate-400"}`}>일정</span>
          </button>
        </div>
      </nav>

    </div>
  );
};

export default SeniorCarePage;
