"use client";

/**
 * 노인복지관 어르신 돌봄 - 메인 화면
 * 큰 글씨·단순 조작, 복약·건강·복지관 일정, 음성 입력, 가족·담당자 알림
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  id: string;
  routine_id: string;
  done_date: string;
  logged_at: string | null;
}

interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface DailyQuiz {
  type: string;
  question: string;
  hint: string;
  choices: string[];
  answer: string;
  explanation: string;
}

const CONTACTS_KEY = "senior-family-contacts-v1";

const HEALTH_EMOJIS = new Set([
  "💊","🩸","🩺","🍚","🍱","🍲","🚶","💧","🏥","🩻","🫀","💉",
  "🏛️","🤝","🧘","🛌","🪥","🛁","😊","📞","🦯","🧠",
]);

// sort_order 범위로 카테고리 파악
const CATEGORY_RANGES: { label: string; from: number; to: number }[] = [
  { label: "💊 복약",     from:  0, to:  2 },
  { label: "🍽️ 식사",     from:  3, to:  5 },
  { label: "🩺 활력징후", from:  6, to:  9 },
  { label: "💧 수분 섭취", from: 10, to: 14 },
  { label: "🚶 활동",     from: 15, to: 17 },
  { label: "🪥 위생",     from: 18, to: 20 },
  { label: "💛 기타",     from: 21, to: 99 },
];

const DEFAULT_HEALTH_CHECKS = [
  // ── 복약 (0~2)
  { emoji: "💊", title: "혈압약",      routine_time: "08:00" },
  { emoji: "💊", title: "당뇨약",      routine_time: "08:30" },
  { emoji: "💊", title: "취침 전 약",  routine_time: "21:00" },
  // ── 식사 (3~5)
  { emoji: "🍚", title: "아침 식사",   routine_time: "08:00" },
  { emoji: "🍱", title: "점심 식사",   routine_time: "12:00" },
  { emoji: "🍲", title: "저녁 식사",   routine_time: "18:00" },
  // ── 활력징후 (6~9)
  { emoji: "🩺", title: "혈압 측정(아침)",  routine_time: "07:30" },
  { emoji: "🩺", title: "혈압 측정(오후)",  routine_time: "14:00" },
  { emoji: "🩺", title: "혈압 측정(저녁)",  routine_time: "20:00" },
  { emoji: "🩸", title: "혈당 측정",         routine_time: "08:00" },
  // ── 수분 (10~14)
  { emoji: "💧", title: "물 마시기(오전1)", routine_time: "09:00" },
  { emoji: "💧", title: "물 마시기(오전2)", routine_time: "11:00" },
  { emoji: "💧", title: "물 마시기(오후1)", routine_time: "14:00" },
  { emoji: "💧", title: "물 마시기(오후2)", routine_time: "16:00" },
  { emoji: "💧", title: "물 마시기(저녁)",  routine_time: "19:00" },
  // ── 활동 (15~17)
  { emoji: "🚶", title: "산책·걷기",    routine_time: "10:00" },
  { emoji: "🧘", title: "체조·재활",    routine_time: "14:30" },
  { emoji: "🛌", title: "낮잠·휴식",    routine_time: "13:30" },
  // ── 위생 (18~20)
  { emoji: "🪥", title: "양치질(아침)", routine_time: "08:30" },
  { emoji: "🪥", title: "양치질(저녁)", routine_time: "21:00" },
  { emoji: "🛁", title: "세수·씻기",    routine_time: "07:00" },
  // ── 기타 (21~)
  { emoji: "😊", title: "기분·컨디션", routine_time: "09:00" },
  { emoji: "📞", title: "가족 통화",    routine_time: "19:00" },
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
  if (h < 12) return "좋은 아침입니다";
  if (h < 18) return "편안한 오후 되세요";
  return "수고 많으셨습니다, 좋은 저녁이에요";
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

const toInputDate = (isoStr: string) => {
  if (!isoStr) return "";
  return new Date(isoStr).toISOString().slice(0, 10);
};

const toInputTime = (isoStr: string) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

const WelfareCenterCarePage = () => {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);

  const [activeTab, setActiveTab] = useState<"home" | "schedule" | "add">("home");
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isParsingVoice, setIsParsingVoice] = useState(false);

  const [showResetBanner, setShowResetBanner] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFamilyShare, setShowFamilyShare] = useState(false);
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  // 일정 추가 상태
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 일정 수정 상태
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [isEditSaving, setIsEditSaving] = useState(false);

  // 건강체크 시간 수정 상태
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [editingCheckTime, setEditingCheckTime] = useState("");

  // 월간 달력 상태
  const [monthlyLogs, setMonthlyLogs] = useState<Record<string, number>>({});
  const [totalRoutineCount, setTotalRoutineCount] = useState(0);

  // 일일 퀴즈 상태
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  // 건강체크 항목 추가 상태
  const [showAddCheck, setShowAddCheck] = useState(false);
  const [newCheckEmoji, setNewCheckEmoji] = useState("💊");
  const [newCheckTitle, setNewCheckTitle] = useState("");
  const [newCheckTime, setNewCheckTime] = useState("09:00");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const { date: todayDate, year: todayYear } = getDateParts();

  // 로컬 스토리지에서 연락처 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONTACTS_KEY);
      if (saved) setContacts(JSON.parse(saved) as FamilyContact[]);
    } catch { /* 무시 */ }
  }, []);

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

  const insertDefaultHealthChecks = useCallback(async (userId: string) => {
    // 기존 항목 완전 삭제 후 삽입 (중복 방지)
    await supabase.from("routine_logs").delete().eq("user_id", userId);
    await supabase.from("routines").delete().eq("user_id", userId);
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
        // 중복 항목 감지 (같은 title이 2개 이상) 또는 구버전 항목
        const titleCounts = (rData as HealthCheck[]).reduce<Record<string, number>>((acc, r) => {
          acc[r.title] = (acc[r.title] ?? 0) + 1;
          return acc;
        }, {});
        const hasDuplicates = Object.values(titleCounts).some((n) => n > 1);
        const isOldStyle = (rData as HealthCheck[]).every((r) => !HEALTH_EMOJIS.has(r.emoji));
        if (isOldStyle || hasDuplicates) setShowResetBanner(true);
      } else {
        await insertDefaultHealthChecks(userId);
      }

      const { data: lData } = await supabase
        .from("routine_logs")
        .select("id, routine_id, done_date, logged_at")
        .eq("user_id", userId)
        .eq("done_date", todayStr)
        .order("logged_at", { ascending: true });
      if (lData) setHealthLogs(lData as HealthLog[]);
    } catch (e) {
      console.error("건강 체크 조회 실패:", e);
    }
  }, [todayStr, insertDefaultHealthChecks]);

  const handleResetHealthChecks = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from("routine_logs").delete().eq("user_id", user.id);
      await supabase.from("routines").delete().eq("user_id", user.id);
      setHealthLogs([]);
      setHealthChecks([]);
      await insertDefaultHealthChecks(user.id);
      setShowResetConfirm(false);
      setShowResetBanner(false);
    } catch (e) {
      console.error("건강 체크 초기화 실패:", e);
    }
  }, [user, insertDefaultHealthChecks]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ id: u.id, email: u.email });
        void fetchSchedules(u.id);
        void fetchHealthChecks(u.id);
        void fetchMonthlyLogs(u.id);
      }
      setAuthLoaded(true);
    });
  }, [fetchSchedules, fetchHealthChecks, fetchMonthlyLogs]);

  const handleToggleHealth = async (checkId: string) => {
    if (!user) return;
    const todayLogs = healthLogs.filter((l) => l.routine_id === checkId && l.done_date === todayStr);
    const isDone = todayLogs.length > 0;
    try {
      if (isDone) {
        // 가장 마지막 로그 하나만 취소 (실수 방지)
        const lastLog = todayLogs[todayLogs.length - 1];
        await supabase.from("routine_logs").delete().eq("id", lastLog.id);
        setHealthLogs((prev) => prev.filter((l) => l.id !== lastLog.id));
      } else {
        // 새 로그 추가 (logged_at = 현재 시각)
        const now = new Date().toISOString();
        const { data: inserted } = await supabase
          .from("routine_logs")
          .insert({ routine_id: checkId, user_id: user.id, done_date: todayStr, logged_at: now })
          .select("id, routine_id, done_date, logged_at")
          .single();
        if (inserted) setHealthLogs((prev) => [...prev, inserted as HealthLog]);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        if ("speechSynthesis" in window) {
          const check = healthChecks.find((c) => c.id === checkId);
          if (check) {
            const utter = new SpeechSynthesisUtterance(`${check.title} 완료!`);
            utter.lang = "ko-KR"; utter.rate = 0.85;
            window.speechSynthesis.speak(utter);
          }
        }
      }
    } catch (e) {
      console.error("건강 체크 토글 실패:", e);
    }
  };

  // + 버튼: 이미 완료된 항목에 추가 로그 기록 (오늘 n번째 체크)
  const handleAddHealthLog = async (checkId: string) => {
    if (!user) return;
    try {
      const now = new Date().toISOString();
      const { data: inserted } = await supabase
        .from("routine_logs")
        .insert({ routine_id: checkId, user_id: user.id, done_date: todayStr, logged_at: now })
        .select("id, routine_id, done_date, logged_at")
        .single();
      if (inserted) {
        setHealthLogs((prev) => [...prev, inserted as HealthLog]);
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
      }
    } catch (e) {
      console.error("추가 체크 기록 실패:", e);
    }
  };

  const handleToggleSchedule = async (schedule: Schedule) => {
    const completing = !schedule.is_completed;
    await supabase.from("todos").update({ is_completed: completing }).eq("id", schedule.id);
    if (completing) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(`${schedule.title} 완료했습니다!`);
        utter.lang = "ko-KR"; utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    }
    if (user?.id) await fetchSchedules(user.id);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("이 일정을 지울까요?")) return;
    await supabase.from("todos").delete().eq("id", id);
    if (user?.id) await fetchSchedules(user.id);
  };

  const fetchMonthlyLogs = useCallback(async (userId: string) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [{ data: logs }, { data: routines }] = await Promise.all([
      supabase.from("routine_logs").select("done_date")
        .eq("user_id", userId).gte("done_date", firstDay).lte("done_date", lastDay),
      supabase.from("routines").select("id").eq("user_id", userId),
    ]);
    const total = routines?.length ?? 0;
    setTotalRoutineCount(total);
    const counts: Record<string, number> = {};
    for (const log of logs ?? []) {
      const d = log.done_date as string;
      counts[d] = (counts[d] ?? 0) + 1;
    }
    setMonthlyLogs(counts);
  }, []);

  const fetchQuiz = useCallback(async () => {
    // 오늘 이미 불러왔으면 재요청 안 함
    const cacheKey = `quiz-${todayStr}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setQuiz(JSON.parse(cached) as DailyQuiz); return; }
    } catch { /* 무시 */ }
    setQuizLoading(true);
    try {
      const res = await fetch(`/api/ai-quiz?date=${todayStr}`);
      const { quiz: q } = await res.json() as { quiz: DailyQuiz };
      setQuiz(q);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(q)); } catch { /* 무시 */ }
    } catch (e) {
      console.error("퀴즈 조회 실패:", e);
    } finally {
      setQuizLoading(false);
    }
  }, [todayStr]);

  const handleAddCheck = async () => {
    if (!newCheckTitle.trim() || !user?.id) return;
    const maxOrder = healthChecks.reduce((m, c) => Math.max(m, c.sort_order), -1);
    const { data: inserted } = await supabase
      .from("routines")
      .insert([{
        user_id: user.id,
        title: newCheckTitle.trim(),
        emoji: newCheckEmoji,
        sort_order: maxOrder + 1,
        routine_time: newCheckTime,
        routine_end_time: null,
      }])
      .select();
    if (inserted) setHealthChecks((prev) => [...prev, ...(inserted as HealthCheck[])]);
    setNewCheckTitle("");
    setNewCheckEmoji("💊");
    setNewCheckTime("09:00");
    setShowAddCheck(false);
  };

  const handleDeleteCheck = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    await supabase.from("routine_logs").delete().eq("routine_id", id);
    await supabase.from("routines").delete().eq("id", id);
    setHealthChecks((prev) => prev.filter((c) => c.id !== id));
    setHealthLogs((prev) => prev.filter((l) => l.routine_id !== id));
  };

  const handleOpenCheckEdit = (check: HealthCheck) => {
    setEditingCheckId(check.id);
    setEditingCheckTime(check.routine_time ?? "");
  };

  const handleCheckTimeSave = async () => {
    if (!editingCheckId) return;
    try {
      await supabase
        .from("routines")
        .update({ routine_time: editingCheckTime })
        .eq("id", editingCheckId);
      setHealthChecks((prev) =>
        prev.map((c) =>
          c.id === editingCheckId ? { ...c, routine_time: editingCheckTime } : c,
        ),
      );
    } catch (e) {
      console.error("시간 수정 실패:", e);
    } finally {
      setEditingCheckId(null);
      setEditingCheckTime("");
    }
  };

  const handleOpenEdit = (s: Schedule) => {
    setEditingSchedule(s);
    setEditTitle(s.title);
    setEditDate(toInputDate(s.start_time));
    setEditTime(toInputTime(s.start_time));
  };

  const handleEditSave = async () => {
    if (!editingSchedule || !editTitle.trim() || !user?.id) return;
    setIsEditSaving(true);
    try {
      const startDt = editDate && editTime ? `${editDate}T${editTime}:00` : editingSchedule.start_time;
      const endDt = editDate && editTime ? addOneHour(editDate, editTime) : editingSchedule.end_time;
      const { error } = await supabase.from("todos").update({
        title: editTitle.trim(),
        start_time: startDt,
        end_time: endDt,
      }).eq("id", editingSchedule.id);
      if (error) throw new Error(error.message);
      setEditingSchedule(null);
      await fetchSchedules(user.id);
    } catch (e) {
      console.error("일정 수정 실패:", e);
      alert("수정에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsEditSaving(false);
    }
  };

  const buildFamilyMessage = () => {
    const now = new Date();
    const doneItems = healthChecks
      .map((c) => {
        const done = healthLogs.some((l) => l.routine_id === c.id && l.done_date === todayStr);
        return `${done ? "✅" : "❌"} ${c.title}`;
      })
      .join("\n");
    const doneCount = healthLogs.filter((l) => l.done_date === todayStr).length;
    const total = healthChecks.length;
    const todayScheduleList = schedules
      .filter((s) => new Date(s.start_time).toISOString().slice(0, 10) === todayStr)
      .map((s) => `• ${s.title}`)
      .join("\n");
    return (
      `🏛️ 노인복지관 어르신 오늘 안내\n📅 ${now.getMonth() + 1}월 ${now.getDate()}일\n\n` +
      `건강·복약 체크 (${doneCount}/${total})\n${doneItems}\n` +
      (todayScheduleList ? `\n오늘 일정\n${todayScheduleList}\n` : "") +
      `\n노인복지관 어르신 돌봄`
    );
  };

  const handleSaveContact = () => {
    if (!newContactName.trim()) { alert("이름을 입력해 주세요."); return; }
    if (!newContactPhone.trim() && !newContactEmail.trim()) {
      alert("전화번호 또는 이메일 중 하나는 입력해 주세요."); return;
    }
    const next: FamilyContact[] = [
      ...contacts,
      { id: Date.now().toString(), name: newContactName.trim(), phone: newContactPhone.trim(), email: newContactEmail.trim() },
    ];
    setContacts(next);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
    setNewContactName(""); setNewContactPhone(""); setNewContactEmail("");
    setShowAddContact(false);
  };

  const handleDeleteContact = (id: string) => {
    const next = contacts.filter((c) => c.id !== id);
    setContacts(next);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
  };

  // SMS: sms: 스킴 사용 (HTTPS 불필요, 문자 앱 바로 열림)
  const handleSendSMS = (phone: string) => {
    const msg = buildFamilyMessage();
    const clean = phone.replace(/-/g, "");
    window.location.href = `sms:${clean}?body=${encodeURIComponent(msg)}`;
  };

  // 이메일: mailto: 스킴 사용 (HTTPS 불필요)
  const handleSendEmail = (email: string) => {
    const msg = buildFamilyMessage();
    const now = new Date();
    const subject = encodeURIComponent(
      `복지관 안내 ${now.getMonth() + 1}월 ${now.getDate()}일 어르신 건강·일정`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(msg)}`;
  };

  const handleVoiceInput = () => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      alert("이 기기에서는 음성 입력을 지원하지 않습니다.\n직접 입력창에 써 주세요.");
      return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }

    const SR = (window.SpeechRecognition || window.webkitSpeechRecognition) as new () => SpeechRecognition;
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
        const result = await res.json() as Array<{ title: string; start: string }>;
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
    recognition.onerror = () => { setIsListening(false); alert("음성을 인식하지 못했습니다."); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSaveSchedule = async () => {
    if (!newTitle.trim()) { alert("일정 제목을 입력해 주세요."); return; }
    if (!user?.id) { alert("로그인이 필요합니다."); return; }
    setIsSaving(true);
    try {
      const now = new Date();
      const startDt = newDate && newTime ? `${newDate}T${newTime}:00` : now.toISOString();
      const endDt = newDate && newTime ? addOneHour(newDate, newTime) : new Date(now.getTime() + 3600000).toISOString();
      const { error } = await supabase.from("todos").insert([{
        title: newTitle.trim(), description: "",
        start_time: startDt, end_time: endDt,
        user_id: user.id, is_completed: false,
      }]);
      if (error) throw new Error(error.message);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(`${newTitle.trim()} 일정이 저장되었습니다.`);
        utter.lang = "ko-KR"; utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
      setNewTitle(""); setNewDate(""); setNewTime(""); setVoiceText("");
      await fetchSchedules(user.id);
      setActiveTab("schedule");
    } catch (e) {
      console.error("일정 저장 실패:", e);
      alert(`저장에 실패했습니다.\n${e instanceof Error ? e.message : "다시 시도해 주세요."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const todaySchedules = schedules.filter(
    (s) => new Date(s.start_time).toISOString().slice(0, 10) === todayStr
  );
  const doneCount = healthLogs.filter((l) => l.done_date === todayStr).length;
  const totalCount = healthChecks.length;

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <p className="text-3xl font-bold text-emerald-900 animate-pulse">불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10">
          <p className="text-7xl mb-4" aria-hidden>🏛️</p>
          <h1 className="text-4xl font-black text-emerald-950 mb-2 leading-tight">
            노인복지관<br />어르신 돌봄
          </h1>
          <p className="text-xl text-stone-600 font-bold px-2">
            복약·건강·복지관 일정을 큰 글씨로, 말로도 적을 수 있어요
          </p>
        </div>
        <button type="button" onClick={() => { window.location.href = "/login"; }}
          className="w-full max-w-sm bg-emerald-800 text-white text-3xl font-black py-8 rounded-[32px] shadow-2xl active:scale-[0.98] transition-all">
          이용 시작하기
        </button>
        <button type="button" onClick={() => { window.location.href = "/signup"; }}
          className="mt-6 text-xl font-bold text-emerald-900 underline underline-offset-4">
          처음이신가요? 회원가입
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* 헤더 */}
      <header className="bg-white px-5 pt-7 pb-5 shadow-sm border-b border-stone-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-black tracking-wide text-emerald-800 uppercase">노인복지관 어르신 돌봄</p>
            <p className="text-lg font-bold text-emerald-900 leading-tight mt-1">{getGreeting()}</p>
            <p className="text-lg font-bold text-stone-500 leading-tight">{todayYear}</p>
            <p className="text-3xl font-black text-stone-900 leading-tight mt-0.5">{todayDate}</p>
          </div>
          <div className="flex flex-col gap-2 items-end ml-3">
            <button type="button" onClick={() => setShowFamilyShare(true)}
              className="bg-amber-50 text-amber-900 border-2 border-amber-300 text-base font-black px-4 py-2.5 rounded-2xl active:scale-95 flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-xl" aria-hidden>📣</span> 가족·담당자 알림
            </button>
            <button type="button" onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/login"; })}
              className="bg-stone-100 text-stone-600 text-base font-bold px-4 py-2.5 rounded-2xl active:scale-95 border border-stone-200">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-36">

        {/* ── 홈 탭 ── */}
        {activeTab === "home" && (
          <div className="px-4 pt-5 space-y-5">

            {/* 구버전 항목 감지 배너 */}
            {showResetBanner && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-[24px] p-5">
                <p className="text-xl font-black text-amber-900 mb-1">항목이 중복되거나 예전 항목이에요</p>
                <p className="text-lg text-amber-800 leading-relaxed mb-4">
                  기존 항목을 지우고 새 항목으로 바꿀까요?<br />(혈압약·식사·혈압 측정 등 23개)
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => void handleResetHealthChecks()}
                    className="flex-1 bg-amber-500 text-white text-xl font-black py-4 rounded-2xl active:scale-95">
                    네, 바꿀게요
                  </button>
                  <button type="button" onClick={() => setShowResetBanner(false)}
                    className="flex-1 bg-white text-slate-400 text-xl font-bold py-4 rounded-2xl border border-slate-200 active:scale-95">
                    그냥 둘게요
                  </button>
                </div>
              </div>
            )}

            {/* 오늘의 퀴즈 카드 */}
            <section className="bg-amber-50 rounded-[24px] p-5 shadow-sm border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">오늘의 퀴즈</p>
                  <p className="text-xl font-black text-amber-900">두뇌 자극 한 문제 🧠</p>
                </div>
                {!quiz && (
                  <button
                    type="button"
                    onClick={() => void fetchQuiz()}
                    disabled={quizLoading}
                    className="bg-amber-400 text-amber-950 text-lg font-black px-5 py-3 rounded-2xl active:scale-95 disabled:opacity-50"
                  >
                    {quizLoading ? "생성 중…" : "퀴즈 시작"}
                  </button>
                )}
              </div>

              {quiz && (
                <div>
                  <p className="text-lg font-bold text-amber-700 mb-1">
                    [{quiz.type}] {quiz.hint}
                  </p>
                  <p className="text-2xl font-black text-amber-950 mb-4 leading-snug">
                    {quiz.question}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {quiz.choices.map((choice) => {
                      const isSelected = quizSelected === choice;
                      const isCorrect = choice === quiz.answer;
                      let bg = "bg-white border-2 border-amber-200 text-stone-800";
                      if (quizAnswered) {
                        if (isCorrect) bg = "bg-emerald-500 border-emerald-500 text-white";
                        else if (isSelected) bg = "bg-red-400 border-red-400 text-white";
                      } else if (isSelected) {
                        bg = "bg-amber-300 border-amber-400 text-amber-950";
                      }
                      return (
                        <button
                          key={choice}
                          type="button"
                          disabled={quizAnswered}
                          onClick={() => {
                            setQuizSelected(choice);
                            setQuizAnswered(true);
                            if (choice === quiz.answer) {
                              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                              if ("speechSynthesis" in window) {
                                const utter = new SpeechSynthesisUtterance("정답입니다! 훌륭해요!");
                                utter.lang = "ko-KR"; utter.rate = 0.85;
                                window.speechSynthesis.speak(utter);
                              }
                            }
                          }}
                          className={`${bg} text-xl font-black py-4 rounded-2xl active:scale-95 transition-all`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                  {quizAnswered && (
                    <div className={`rounded-2xl p-4 ${quizSelected === quiz.answer ? "bg-emerald-100" : "bg-red-50"}`}>
                      <p className={`text-lg font-black ${quizSelected === quiz.answer ? "text-emerald-800" : "text-red-700"}`}>
                        {quizSelected === quiz.answer ? "🎉 정답이에요!" : `😊 정답은 "${quiz.answer}"이에요`}
                      </p>
                      <p className="text-base text-stone-600 mt-1">{quiz.explanation}</p>
                      <button
                        type="button"
                        onClick={() => { setQuiz(null); setQuizSelected(null); setQuizAnswered(false); }}
                        className="mt-3 text-base font-black text-amber-700 underline"
                      >
                        다른 문제 풀기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 오늘 건강·복약 체크 */}
            <section className="bg-white rounded-[28px] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-black text-stone-800">오늘 건강·복약</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-emerald-800 bg-emerald-100 px-4 py-1.5 rounded-full">
                    {doneCount}/{totalCount}
                  </span>
                  <button type="button" onClick={() => setShowAddCheck(true)}
                    className="text-xl font-black text-emerald-800 bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center active:scale-95">
                    +
                  </button>
                  <button type="button" onClick={() => setShowResetConfirm(true)}
                    className="text-xl text-slate-400 bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center active:scale-95">
                    ⚙️
                  </button>
                </div>
              </div>

              {/* 진행 바 */}
              <div className="w-full bg-slate-100 rounded-full h-4 mb-4">
                <div className="bg-emerald-600 h-4 rounded-full transition-all duration-700"
                  style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }} />
              </div>

              {doneCount === totalCount && totalCount > 0 && (
                <div className="text-center mb-4 py-3 bg-emerald-50 rounded-2xl space-y-2">
                  <p className="text-xl font-black text-emerald-900">오늘 체크를 모두 하셨어요 🎉</p>
                  <button type="button" onClick={() => setShowFamilyShare(true)}
                    className="text-lg font-bold text-amber-800 underline underline-offset-2">
                    가족·담당자에게 알리기
                  </button>
                </div>
              )}
              {/* 보호자 링크 공유 */}
              {user && (
                <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 mb-2">
                  <div>
                    <p className="text-base font-black text-stone-700">보호자 현황 링크</p>
                    <p className="text-sm text-stone-400">가족·요양보호사가 오늘 현황을 볼 수 있어요</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/caregiver/${user.id}`;
                      if (navigator.clipboard) {
                        void navigator.clipboard.writeText(url);
                        alert("링크가 복사되었어요!\n가족·요양보호사에게 보내주세요.");
                      }
                    }}
                    className="bg-emerald-800 text-white text-base font-black px-4 py-2.5 rounded-xl active:scale-95"
                  >
                    링크 복사
                  </button>
                </div>
              )}

              {/* 카테고리별 리스트 */}
              <div className="space-y-4">
                {CATEGORY_RANGES.map((cat) => {
                  const items = healthChecks.filter(
                    (c) => c.sort_order >= cat.from && c.sort_order <= cat.to,
                  );
                  if (items.length === 0) return null;
                  return (
                    <div key={cat.label}>
                      <p className="text-base font-black text-stone-500 mb-2 px-1">{cat.label}</p>
                      <div className="space-y-2">
                        {items.map((check) => {
                          const todayLogList = healthLogs.filter(
                            (l) => l.routine_id === check.id && l.done_date === todayStr,
                          );
                          const isDone = todayLogList.length > 0;
                          const logCount = todayLogList.length;
                          return (
                            <div
                              key={check.id}
                              className={`rounded-2xl px-4 py-3 transition-all ${
                                isDone ? "bg-emerald-700" : "bg-stone-50 border border-stone-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* 체크 버튼 */}
                                <button
                                  type="button"
                                  onClick={() => void handleToggleHealth(check.id)}
                                  className={`w-12 h-12 rounded-full border-4 flex-shrink-0 flex items-center justify-center active:scale-90 transition-all ${
                                    isDone ? "bg-white border-white" : "border-stone-300 bg-white"
                                  }`}
                                  aria-label={isDone ? "완료 취소" : "체크"}
                                >
                                  {isDone && (
                                    <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>

                                {/* 이모지 + 이름 + 횟수 뱃지 */}
                                <span className="text-2xl flex-shrink-0">{check.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xl font-black leading-tight ${isDone ? "text-white" : "text-stone-800"}`}>
                                    {check.title}
                                  </span>
                                  {logCount > 1 && (
                                    <span className="ml-2 text-sm font-black bg-white/30 text-white px-2 py-0.5 rounded-full">
                                      오늘 {logCount}회
                                    </span>
                                  )}
                                </div>

                                {/* 오른쪽: 시간 + 버튼들 */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className={`text-base font-bold ${isDone ? "text-emerald-100" : "text-stone-500"}`}>
                                    {check.routine_time ?? ""}
                                  </span>
                                  <div className="flex gap-1">
                                    {/* 추가 체크 버튼 (완료 상태일 때만) */}
                                    {isDone && (
                                      <button
                                        type="button"
                                        onClick={() => void handleAddHealthLog(check.id)}
                                        className="text-xs font-black px-2 py-1 rounded-lg bg-white/30 text-white active:scale-95"
                                        aria-label="한 번 더 체크"
                                      >
                                        +1회
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCheckEdit(check)}
                                      className={`text-xs font-black px-2 py-1 rounded-lg active:scale-95 ${
                                        isDone ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
                                      }`}
                                    >
                                      시간
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteCheck(check.id)}
                                      className={`text-xs font-black px-2 py-1 rounded-lg active:scale-95 ${
                                        isDone ? "bg-white/20 text-white" : "bg-red-100 text-red-500"
                                      }`}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* 오늘 체크 시각 목록 (2회 이상일 때) */}
                              {logCount > 1 && (
                                <div className="mt-2 flex flex-wrap gap-1 pl-16">
                                  {todayLogList.map((log, idx) => (
                                    <span key={log.id} className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                      {idx + 1}회{log.logged_at
                                        ? ` ${new Date(log.logged_at).getHours()}시${String(new Date(log.logged_at).getMinutes()).padStart(2, "0")}분`
                                        : ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 이달 건강 달력 */}
            {totalRoutineCount > 0 && (
              <section className="bg-white rounded-[24px] p-5 shadow-sm">
                <p className="text-xl font-black text-stone-800 mb-3">
                  📅 이달 건강 체크 달력
                </p>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["일","월","화","수","목","금","토"].map((d) => (
                    <p key={d} className="text-xs font-black text-stone-400 pb-1">{d}</p>
                  ))}
                  {(() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = now.getMonth();
                    const firstDow = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const cells: React.ReactNode[] = [];
                    for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const done = monthlyLogs[key] ?? 0;
                      const pct  = Math.min(done / totalRoutineCount, 1);
                      const isToday = key === todayStr;
                      let bg = "bg-stone-100 text-stone-400";
                      if (pct >= 1)        bg = "bg-emerald-600 text-white";
                      else if (pct >= 0.7) bg = "bg-emerald-400 text-white";
                      else if (pct >= 0.4) bg = "bg-emerald-200 text-emerald-900";
                      else if (pct > 0)    bg = "bg-emerald-100 text-emerald-700";
                      cells.push(
                        <div key={key}
                          className={`aspect-square rounded-xl flex items-center justify-center text-base font-black ${bg} ${isToday ? "ring-2 ring-amber-400" : ""}`}>
                          {d}
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
                <div className="flex gap-3 mt-3 justify-end">
                  {[["bg-emerald-600","100%"],["bg-emerald-400","70%+"],["bg-emerald-200","40%+"],["bg-emerald-100","1%+"],["bg-stone-100","0%"]].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1">
                      <div className={`w-4 h-4 rounded ${c}`} />
                      <span className="text-xs text-stone-500">{l}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 오늘 일정 */}
            <section>
              <h2 className="text-2xl font-black text-stone-800 mb-3 px-1">오늘 복지관·병원 일정</h2>
              {todaySchedules.length === 0 ? (
                <div className="bg-white rounded-[24px] p-8 text-center shadow-sm">
                  <p className="text-5xl mb-3">📅</p>
                  <p className="text-xl font-bold text-stone-500">오늘 적힌 일정이 없어요</p>
                  <p className="text-lg text-stone-400 mt-1">아래 ‘말하기’로 복지관 일정을 넣을 수 있어요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedules.map((s) => (
                    <div key={s.id} className={`bg-white rounded-[24px] p-5 shadow-sm ${s.is_completed ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => void handleToggleSchedule(s)}
                          className={`w-14 h-14 rounded-full border-4 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                            s.is_completed ? "bg-emerald-600 border-emerald-600" : "border-stone-300 bg-white"
                          }`}>
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
                          <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatScheduleTime(s.start_time)}</p>
                        </div>
                        <button type="button" onClick={() => handleOpenEdit(s)}
                          className="w-12 h-12 flex items-center justify-center text-2xl bg-slate-50 rounded-2xl active:scale-90 flex-shrink-0">
                          ✏️
                        </button>
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
            <h2 className="text-2xl font-black text-stone-800 mb-1">모든 일정</h2>
            {schedules.length === 0 ? (
              <div className="bg-white rounded-[24px] p-10 text-center shadow-sm">
                <p className="text-5xl mb-3">📋</p>
                <p className="text-xl font-bold text-slate-400">등록된 일정이 없어요</p>
              </div>
            ) : (
              schedules.map((s) => {
                const isPast = new Date(s.start_time) < new Date() && !s.is_completed;
                return (
                  <div key={s.id} className={`bg-white rounded-[24px] p-5 shadow-sm ${isPast ? "border-l-4 border-rose-400" : ""}`}>
                    <div className="flex items-center gap-3">
                      {/* 완료 버튼 */}
                      <button type="button" onClick={() => void handleToggleSchedule(s)}
                        className={`w-14 h-14 rounded-full border-4 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                          s.is_completed ? "bg-emerald-600 border-emerald-600" : "border-stone-300 bg-white"
                        }`}>
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
                        <p className={`text-lg font-bold mt-0.5 ${isPast && !s.is_completed ? "text-rose-400" : "text-emerald-700"}`}>
                          {formatScheduleTime(s.start_time)}
                          {isPast && !s.is_completed && " ⚠️"}
                        </p>
                      </div>
                      {/* 수정 버튼 */}
                      <button type="button" onClick={() => handleOpenEdit(s)}
                        className="w-12 h-12 flex items-center justify-center text-2xl bg-emerald-50 rounded-2xl active:scale-90 flex-shrink-0">
                        ✏️
                      </button>
                      {/* 삭제 버튼 */}
                      <button type="button" onClick={() => void handleDeleteSchedule(s.id)}
                        className="w-12 h-12 flex items-center justify-center text-2xl bg-red-50 rounded-2xl active:scale-90 flex-shrink-0">
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
            <h2 className="text-2xl font-black text-stone-800">일정 적기</h2>
            {voiceText && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[24px] p-5">
                <p className="text-lg font-bold text-emerald-900 mb-1">말씀하신 내용</p>
                <p className="text-xl font-bold text-slate-700">&ldquo;{voiceText}&rdquo;</p>
                {isParsingVoice && <p className="text-lg text-emerald-600 mt-2 animate-pulse">날짜·시간 분석 중...</p>}
              </div>
            )}
            <div className="bg-white rounded-[24px] p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-xl font-black text-stone-700 mb-2">무슨 일정인가요</label>
                <input className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500 placeholder:text-stone-400"
                  value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="예: 복지관 낮잠터, 병원, 점심 모임" />
              </div>
              <div>
                <label className="block text-xl font-black text-stone-700 mb-2">날짜</label>
                <input type="date" className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                  value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xl font-black text-stone-700 mb-2">시간</label>
                <input type="time" className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                  value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            </div>
            <button type="button" onClick={() => void handleSaveSchedule()} disabled={!newTitle.trim() || isSaving}
              className="w-full bg-emerald-800 text-white text-3xl font-black py-7 rounded-[32px] shadow-xl active:scale-95 transition-all disabled:opacity-40">
              {isSaving ? "저장 중..." : "일정 저장하기"}
            </button>
            <button type="button" onClick={() => { setNewTitle(""); setNewDate(""); setNewTime(""); setVoiceText(""); }}
              className="w-full bg-slate-100 text-slate-500 text-xl font-bold py-5 rounded-[24px] active:scale-95 transition-all">
              다시 입력하기
            </button>
          </div>
        )}
      </main>

      {/* ── 일정 수정 모달 ── */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-[40px] w-full max-w-[480px] p-7 shadow-2xl">
            <h3 className="text-2xl font-black text-stone-900 mb-5">일정 고치기</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xl font-black text-stone-700 mb-2">일정 이름</label>
                <input className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                  value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xl font-black text-stone-700 mb-2">날짜</label>
                <input type="date" className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                  value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xl font-black text-stone-700 mb-2">시간</label>
                <input type="time" className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                  value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => void handleEditSave()} disabled={!editTitle.trim() || isEditSaving}
                className="flex-1 bg-emerald-800 text-white text-2xl font-black py-6 rounded-[24px] active:scale-95 disabled:opacity-40">
                {isEditSaving ? "저장 중..." : "수정 저장"}
              </button>
              <button type="button" onClick={() => setEditingSchedule(null)}
                className="flex-1 bg-slate-100 text-slate-500 text-2xl font-bold py-6 rounded-[24px] active:scale-95">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 건강체크 항목 추가 모달 ── */}
      {showAddCheck && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm shadow-2xl">
            <p className="text-2xl font-black text-stone-900 mb-5">항목 추가</p>
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-black text-stone-700 mb-2">이모지</label>
                <input
                  type="text"
                  value={newCheckEmoji}
                  onChange={(e) => setNewCheckEmoji(e.target.value)}
                  maxLength={2}
                  className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-3xl text-center outline-none border-2 border-stone-200 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-lg font-black text-stone-700 mb-2">항목 이름</label>
                <input
                  type="text"
                  value={newCheckTitle}
                  onChange={(e) => setNewCheckTitle(e.target.value)}
                  placeholder="예: 비타민 복용"
                  className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500 placeholder:text-stone-400"
                />
              </div>
              <div>
                <label className="block text-lg font-black text-stone-700 mb-2">시간</label>
                <input
                  type="time"
                  value={newCheckTime}
                  onChange={(e) => setNewCheckTime(e.target.value)}
                  className="w-full bg-stone-50 rounded-2xl px-4 py-4 text-2xl font-black text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => void handleAddCheck()}
                disabled={!newCheckTitle.trim()}
                className="flex-1 bg-emerald-800 text-white text-xl font-black py-5 rounded-2xl active:scale-95 disabled:opacity-40"
              >
                추가
              </button>
              <button
                type="button"
                onClick={() => setShowAddCheck(false)}
                className="flex-1 bg-stone-100 text-stone-500 text-xl font-bold py-5 rounded-2xl active:scale-95"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 건강체크 시간 수정 모달 ── */}
      {editingCheckId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm shadow-2xl">
            <p className="text-2xl font-black text-stone-900 mb-2">시간 수정</p>
            <p className="text-lg text-stone-500 mb-5 font-bold">
              {healthChecks.find((c) => c.id === editingCheckId)?.emoji}{" "}
              {healthChecks.find((c) => c.id === editingCheckId)?.title}
            </p>
            <input
              type="time"
              value={editingCheckTime}
              onChange={(e) => setEditingCheckTime(e.target.value)}
              className="w-full bg-stone-50 rounded-2xl px-4 py-5 text-3xl font-black text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500 mb-5"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleCheckTimeSave()}
                className="flex-1 bg-emerald-800 text-white text-xl font-black py-5 rounded-2xl active:scale-95"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditingCheckId(null)}
                className="flex-1 bg-stone-100 text-stone-500 text-xl font-bold py-5 rounded-2xl active:scale-95"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 가족 알림 모달 ── */}
      {showFamilyShare && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-[40px] w-full max-w-[480px] shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>

            <div className="px-7 pt-7 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-stone-900">가족·복지관 담당자 알리기</h3>
                <p className="text-lg text-stone-600 mt-0.5 font-bold">오늘 건강·일정을 문자나 카톡으로 보낼 수 있어요</p>
              </div>
              <button type="button" onClick={() => { setShowFamilyShare(false); setShowAddContact(false); }}
                className="text-2xl text-slate-400 bg-slate-100 w-11 h-11 rounded-full flex items-center justify-center active:scale-95">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* 오늘 건강 현황 미리보기 */}
              <div className="bg-emerald-50 rounded-[20px] p-5 space-y-1.5">
                <p className="text-lg font-black text-emerald-950 mb-2">보낼 내용 미리보기</p>
                {healthChecks.map((c) => {
                  const done = healthLogs.some((l) => l.routine_id === c.id && l.done_date === todayStr);
                  return (
                    <p key={c.id} className={`text-xl font-bold ${done ? "text-emerald-900" : "text-slate-400"}`}>
                      {done ? "✅" : "❌"} {c.title}
                    </p>
                  );
                })}
                {todaySchedules.length > 0 && (
                  <>
                    <p className="text-base font-black text-emerald-800 pt-2">오늘 일정</p>
                    {todaySchedules.map((s) => (
                      <p key={s.id} className="text-lg font-bold text-slate-600">• {s.title}</p>
                    ))}
                  </>
                )}
              </div>

              {/* 연락처 목록 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xl font-black text-stone-800">연락처</p>
                  <button type="button" onClick={() => setShowAddContact(!showAddContact)}
                    className="text-lg font-black text-emerald-800 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200 active:scale-95">
                    + 추가
                  </button>
                </div>

                {/* 연락처 추가 폼 */}
                {showAddContact && (
                  <div className="bg-slate-50 rounded-[20px] p-5 mb-4 space-y-3">
                    <p className="text-lg font-black text-stone-700">새 연락처 등록</p>
                    <input className="w-full bg-white rounded-2xl px-4 py-3.5 text-xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                      placeholder="이름 (예: 사회복지사, 딸 ○○)"
                      value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
                    <input className="w-full bg-white rounded-2xl px-4 py-3.5 text-xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                      placeholder="전화번호 (예: 010-1234-5678)"
                      type="tel" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
                    <input className="w-full bg-white rounded-2xl px-4 py-3.5 text-xl font-bold text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500"
                      placeholder="이메일 (선택)"
                      type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} />
                    <div className="flex gap-3">
                      <button type="button" onClick={handleSaveContact}
                        className="flex-1 bg-emerald-800 text-white text-xl font-black py-4 rounded-2xl active:scale-95">
                        저장
                      </button>
                      <button type="button" onClick={() => setShowAddContact(false)}
                        className="flex-1 bg-white text-slate-400 text-xl font-bold py-4 rounded-2xl border border-slate-200 active:scale-95">
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* 등록된 연락처 */}
                {contacts.length === 0 ? (
                  <div className="bg-slate-50 rounded-[20px] p-6 text-center">
                    <p className="text-xl font-bold text-slate-400">등록된 연락처가 없어요</p>
                    <p className="text-lg text-slate-300 mt-1">위 + 추가 버튼으로 등록하세요</p>
                    <p className="text-base text-stone-600 mt-3 bg-amber-50 rounded-xl px-3 py-2 font-bold">
                      가족, 요양보호사, 복지관 담당자 등을 넣을 수 있어요
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-2xl font-black text-slate-800">{contact.name}</p>
                          <button type="button" onClick={() => handleDeleteContact(contact.id)}
                            className="text-slate-300 text-xl active:text-rose-400 active:scale-90">
                            🗑️
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {contact.phone && (
                            <button type="button" onClick={() => handleSendSMS(contact.phone)}
                              className="w-full bg-green-700 text-white text-xl font-black py-4 rounded-2xl active:scale-95 flex items-center justify-center gap-2">
                              <span aria-hidden>💬</span> 문자 보내기 ({contact.phone})
                            </button>
                          )}
                          {contact.email && (
                            <button type="button" onClick={() => handleSendEmail(contact.email)}
                              className="w-full bg-emerald-800 text-white text-xl font-black py-4 rounded-2xl active:scale-95 flex items-center justify-center gap-2">
                              <span aria-hidden>📧</span> 이메일 보내기
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 직접 선택해서 보내기 안내 */}
              <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5">
                <p className="text-lg font-black text-amber-900 mb-1">카카오톡으로 보내기</p>
                <p className="text-lg text-amber-800 leading-relaxed font-bold">
                  아래 글을 길게 눌러 복사한 뒤,<br />카카오톡에 붙여 넣으세요
                </p>
                <textarea
                  readOnly
                  className="w-full mt-3 bg-white rounded-2xl p-4 text-lg text-slate-700 font-bold border border-amber-200 resize-none"
                  rows={6}
                  value={buildFamilyMessage()}
                  onFocus={(e) => e.target.select()}
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 건강 체크 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm shadow-2xl">
            <p className="text-2xl font-black text-stone-900 mb-2">건강·복약 항목 다시 맞추기</p>
            <div className="bg-emerald-50 rounded-2xl p-4 mb-5 space-y-1">
              {DEFAULT_HEALTH_CHECKS.map((c) => (
                <p key={c.title} className="text-lg font-bold text-emerald-900">{c.emoji} {c.title}</p>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => void handleResetHealthChecks()}
                className="flex-1 bg-emerald-800 text-white text-xl font-black py-5 rounded-2xl active:scale-95">
                네, 바꿀게요
              </button>
              <button type="button" onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-slate-100 text-slate-500 text-xl font-bold py-5 rounded-2xl active:scale-95">
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-2xl" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="flex items-center justify-around px-4 py-3">
          <button type="button" onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl transition-all active:scale-95 ${activeTab === "home" ? "bg-emerald-50" : ""}`}>
            <span className="text-4xl" aria-hidden>🏛️</span>
            <span className={`text-lg font-black ${activeTab === "home" ? "text-emerald-900" : "text-stone-400"}`}>오늘</span>
          </button>
          <button type="button" onClick={handleVoiceInput}
            className={`flex flex-col items-center justify-center w-24 h-24 rounded-full shadow-2xl transition-all active:scale-95 -mt-8 ${
              isListening ? "bg-orange-600 animate-pulse shadow-orange-300" : "bg-emerald-800 shadow-emerald-300"
            }`}>
            <span className="text-4xl" aria-hidden>{isListening ? "⏹️" : "🎤"}</span>
            <span className="text-base font-black text-white">{isListening ? "멈추기" : "말하기"}</span>
          </button>
          <button type="button" onClick={() => setActiveTab("schedule")}
            className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl transition-all active:scale-95 ${activeTab === "schedule" ? "bg-emerald-50" : ""}`}>
            <span className="text-4xl" aria-hidden>📋</span>
            <span className={`text-lg font-black ${activeTab === "schedule" ? "text-emerald-900" : "text-stone-400"}`}>일정</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default WelfareCenterCarePage;
