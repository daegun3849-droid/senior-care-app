"use client";

/**
 * AI PLANNER 메인 페이지
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import confetti from "canvas-confetti";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Calendar } from "@/components/ui/calendar";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

interface EditData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

interface PlanTemplate {
  id: string;
  title: string;
  description: string;
  category: "면접" | "시험" | "업무 루틴" | "내 템플릿";
  isPremium?: boolean;
  payload: {
    rawInput: string;
    description: string;
    startTime: string;
    endTime: string;
  };
}

interface ParsedSchedule {
  title: string;
  desc: string;
  start: string;
  end: string;
}

interface Routine {
  id: string;
  title: string;
  emoji: string;
  sort_order: number;
  routine_time: string | null;
  routine_end_time: string | null;
}

interface RoutineLog {
  routine_id: string;
  done_date: string;
}

const LOCAL_TEMPLATE_KEY = "ai-planner-user-templates-v1";

const QUOTES = [
  { text: "오늘 할 수 있는 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
  { text: "작은 진전도 진전이다.", author: "익명" },
  { text: "시작이 반이다.", author: "아리스토텔레스" },
  { text: "꿈을 향해 자신있게 나아가라.", author: "헨리 데이비드 소로" },
  { text: "성공은 준비와 기회가 만나는 곳에 있다.", author: "세네카" },
  { text: "포기란 없다. 다만 중간 휴식이 있을 뿐이다.", author: "익명" },
  { text: "어제는 역사, 내일은 미스터리, 오늘은 선물이다.", author: "엘리너 루스벨트" },
  { text: "한 걸음씩 나아가다 보면 산 정상에 오를 수 있다.", author: "중국 속담" },
  { text: "지금 이 순간에 집중하라.", author: "익명" },
  { text: "할 수 있다고 생각하면 할 수 있다.", author: "헨리 포드" },
  { text: "실패는 성공의 어머니다.", author: "익명" },
  { text: "오늘의 노력이 내일의 나를 만든다.", author: "익명" },
  { text: "목표를 향해 한 발자국씩.", author: "익명" },
  { text: "끈기는 재능보다 강하다.", author: "익명" },
  { text: "변화는 두려움이 아닌 기회다.", author: "익명" },
  { text: "최선을 다한 오늘이 최고의 내일을 만든다.", author: "익명" },
  { text: "성공한 사람들은 결코 포기하지 않는다.", author: "익명" },
  { text: "스스로를 믿어라. 네 안에 빛이 있다.", author: "익명" },
  { text: "작은 습관이 큰 변화를 만든다.", author: "제임스 클리어" },
  { text: "지금 당장 완벽하지 않아도 된다. 그냥 시작하라.", author: "익명" },
  { text: "도전하지 않으면 변화도 없다.", author: "익명" },
  { text: "하루를 잘 마무리하면 내일이 기대된다.", author: "익명" },
  { text: "자신을 극복하는 자가 진정한 강자다.", author: "노자" },
  { text: "꾸준함이 재능을 이긴다.", author: "익명" },
  { text: "불가능은 없다. 다만 시간이 필요할 뿐이다.", author: "익명" },
  { text: "배움에는 끝이 없다.", author: "공자" },
  { text: "행동이 두려움을 없애준다.", author: "익명" },
  { text: "오늘의 씨앗이 내일의 꽃이 된다.", author: "익명" },
  { text: "열정을 잃지 않고 실패를 거듭할 수 있는 것, 그것이 성공이다.", author: "윈스턴 처칠" },
  { text: "하루하루 최선을 다하면 언젠가 반드시 빛난다.", author: "익명" },
];

const getTodayQuote = () => {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
};

const BASIC_TEMPLATES: PlanTemplate[] = [
  {
    id: "new-weekly-goal",
    title: "🎯 이번 주 목표 세우기",
    description: "월요일 아침 10분, 한 주를 내 것으로 만드는 목표 설정법.",
    category: "업무 루틴",
    payload: {
      rawInput: "주간 목표 설정",
      description: "1) 이번 주 딱 3가지 목표만 정하기\n2) 각 목표마다 '왜 중요한가' 한 줄 적기\n3) 금요일 달성 여부 확인 일정 미리 잡기",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "new-sleep",
    title: "🌙 꿀잠 보장 수면 루틴",
    description: "자도 자도 피곤한 당신을 위한 숙면 준비 루틴.",
    category: "업무 루틴",
    payload: {
      rawInput: "수면 준비 루틴",
      description: "1) 잠들기 1시간 전 핸드폰 멀리 두기\n2) 오늘 잘한 일 3가지 노트에 적기\n3) 내일 첫 번째 할 일 1개만 메모 후 마음 비우기",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "new-money",
    title: "💰 돈이 모이는 소비 점검",
    description: "월말 5분, 이것만 해도 새는 돈이 보입니다.",
    category: "업무 루틴",
    payload: {
      rawInput: "월간 소비 점검",
      description: "1) 이번 달 불필요한 구독 서비스 확인\n2) 충동구매 TOP 3 적고 반성하기\n3) 다음 달 절약 목표 금액 설정",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "new-sns",
    title: "📱 SNS 콘텐츠 기획 30분",
    description: "인스타·유튜브 콘텐츠 아이디어 고갈? 이 루틴으로 해결!",
    category: "업무 루틴",
    payload: {
      rawInput: "콘텐츠 기획 세션",
      description: "1) 요즘 뜨는 트렌드 키워드 5개 조사\n2) 내 채널과 연결되는 아이디어 3개 스케치\n3) 촬영·업로드 일정 달력에 바로 등록",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "new-healing",
    title: "🧘 스트레스 제로 힐링 타임",
    description: "번아웃 오기 전에 먼저 충전. 나를 위한 30분.",
    category: "업무 루틴",
    payload: {
      rawInput: "힐링 타임",
      description: "1) 좋아하는 음악 틀고 눈 감기 10분\n2) 지금 가장 하고 싶은 것 1가지 적기\n3) 산책 or 따뜻한 음료 한 잔 즐기기",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "new-detox",
    title: "🌿 디지털 디톡스 데이",
    description: "SNS·뉴스 없는 하루, 생각보다 훨씬 개운합니다.",
    category: "업무 루틴",
    payload: {
      rawInput: "디지털 디톡스",
      description: "1) SNS 앱 하루 동안 삭제 or 알림 전체 끄기\n2) 종이책 or 산책으로 오프라인 시간 채우기\n3) 저녁에 오늘 느낀 점 짧게 일기 쓰기",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "base-morning",
    isPremium: true,
    title: "🌅 기분 좋은 아침 루틴",
    description: "하루를 에너지 넘치게 시작하는 모닝 루틴. 10분이면 충분!",
    category: "업무 루틴",
    payload: {
      rawInput: "아침 루틴",
      description: "1) 기지개 + 물 한 잔 (5분)\n2) 오늘 할 일 3가지 적기 (5분)\n3) 어제 잘한 점 1가지 떠올리기",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "base-focus",
    isPremium: true,
    title: "🔥 집중력 폭발 딥워크",
    description: "방해 없이 90분 몰입. 끝나면 진짜 뿌듯함이 찾아옵니다.",
    category: "업무 루틴",
    payload: {
      rawInput: "딥워크 집중 세션",
      description: "1) 핸드폰 뒤집기 + 알림 끄기\n2) 핵심 작업 1개만 집중 90분\n3) 완료 후 짧은 보상 (커피, 산책)",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "base-interview",
    isPremium: true,
    title: "💼 면접 당일 마음 정리",
    description: "떨리는 면접 전날·당일, 이것만 하면 자신감이 생깁니다.",
    category: "면접",
    payload: {
      rawInput: "면접 준비",
      description: "1) 지원 동기 3문장으로 정리\n2) 예상 질문 5개 소리 내어 연습\n3) 합격한 내 모습 1분 상상하기",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "base-exam",
    isPremium: true,
    title: "📚 시험 전날 벼락치기",
    description: "시간이 없을 때 효율 극대화! 핵심만 빠르게 훑는 전략.",
    category: "시험",
    payload: {
      rawInput: "시험 벼락치기",
      description: "1) 자주 틀리는 유형 집중 복습 (40분)\n2) 핵심 공식·단어 암기 카드 정리\n3) 모의 문제 1회 풀기 + 오답 체크",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "base-health",
    isPremium: true,
    title: "💪 퇴근 후 활력 충전",
    description: "바쁜 하루 끝, 30분으로 몸과 마음을 리셋하세요.",
    category: "업무 루틴",
    payload: {
      rawInput: "퇴근 후 운동 루틴",
      description: "1) 스트레칭 10분 (목·어깨·허리)\n2) 유산소 or 근력 운동 20분\n3) 따뜻한 물 샤워 + 내일 옷 준비",
      startTime: "",
      endTime: "",
    },
  },
  {
    id: "base-idea",
    isPremium: true,
    title: "💡 아이디어 폭발 브레인스토밍",
    description: "생각이 막힐 때, 판단 없이 쏟아내는 30분.",
    category: "업무 루틴",
    payload: {
      rawInput: "브레인스토밍 세션",
      description: "1) 주제 하나 정하고 타이머 10분 → 떠오르는 것 전부 적기\n2) 마음에 드는 아이디어 3개 골라 구체화\n3) 실행 가능한 첫 번째 액션 1개 결정",
      startTime: "",
      endTime: "",
    },
  },
];

const TodoPage = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [rawInput, setRawInput] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<PlanTemplate[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<ParsedSchedule[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const todayQuote = useMemo(() => getTodayQuote(), []);
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied" | "loading">("idle");
  const [authLoaded, setAuthLoaded] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [newRoutineTitle, setNewRoutineTitle] = useState("");
  const [routineEmoji, setRoutineEmoji] = useState("✅");
  const [routineTime, setRoutineTime] = useState("");
  const [routineEndTime, setRoutineEndTime] = useState("");
  const [editData, setEditData] = useState<EditData>({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ id: u.id, email: u.email });
        void fetchTodos(u.id);
        void fetchRoutines(u.id);
      }
      setAuthLoaded(true);
    });
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") setNotifStatus("granted");
      else if (Notification.permission === "denied") setNotifStatus("denied");
    }
  }, []);

  // 할 일 목록이 바뀔 때마다 브라우저 타이머 알림 등록
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (todos.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    todos.forEach((todo) => {
      if (todo.is_completed) return;

      const startMs = todo.start_time ? new Date(todo.start_time).getTime() : 0;
      const endMs = todo.end_time ? new Date(todo.end_time).getTime() : 0;

      // 시작 30분 전 알림
      const before30 = startMs - 30 * 60 * 1000;
      if (before30 > now) {
        timers.push(setTimeout(() => {
          new Notification(`⏰ 30분 후 시작: ${todo.title}`, {
            body: `곧 일정이 시작됩니다. 준비하세요!`,
            icon: "/icons/icon-192x192.png",
          });
        }, before30 - now));
      }

      // 종료 시간 알림
      if (endMs > now) {
        timers.push(setTimeout(() => {
          new Notification(`🔔 일정 종료: ${todo.title}`, {
            body: "일정 시간이 지났습니다. 완료 처리해 주세요.",
            icon: "/icons/icon-192x192.png",
          });
        }, endMs - now));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [todos]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PlanTemplate[];
      if (Array.isArray(parsed)) {
        setUserTemplates(parsed);
      }
    } catch (error) {
      console.error("템플릿 로드 실패:", error);
    }
  }, []);

  const fetchTodos = async (userId: string) => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: true });
    if (data) setTodos(data as Todo[]);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchRoutines = async (userId: string) => {
    try {
      const { data: rData } = await supabase
        .from("routines")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (rData) setRoutines(rData as Routine[]);

      const { data: lData } = await supabase
        .from("routine_logs")
        .select("routine_id, done_date")
        .eq("user_id", userId)
        .eq("done_date", todayStr);
      if (lData) setRoutineLogs(lData as RoutineLog[]);
    } catch (e) {
      console.error("루틴 조회 실패:", e);
    }
  };

  const handleAddRoutine = async () => {
    if (!user || !newRoutineTitle.trim()) return;
    try {
      const { data } = await supabase
        .from("routines")
        .insert({
          user_id: user.id,
          title: newRoutineTitle.trim(),
          emoji: routineEmoji,
          sort_order: routines.length,
          routine_time: routineTime || null,
          routine_end_time: routineEndTime || null,
        })
        .select()
        .single();
      if (data) setRoutines((prev) => [...prev, data as Routine]);
      setNewRoutineTitle("");
      setRoutineTime("");
      setRoutineEndTime("");
    } catch (e) {
      console.error("루틴 추가 실패:", e);
    }
  };

  const handleToggleRoutine = async (routineId: string) => {
    if (!user) return;
    const isDone = routineLogs.some((l) => l.routine_id === routineId && l.done_date === todayStr);
    try {
      if (isDone) {
        await supabase
          .from("routine_logs")
          .delete()
          .eq("routine_id", routineId)
          .eq("done_date", todayStr);
        setRoutineLogs((prev) => prev.filter((l) => !(l.routine_id === routineId && l.done_date === todayStr)));
      } else {
        await supabase
          .from("routine_logs")
          .insert({ routine_id: routineId, user_id: user.id, done_date: todayStr });
        setRoutineLogs((prev) => [...prev, { routine_id: routineId, done_date: todayStr }]);
      }
    } catch (e) {
      console.error("루틴 토글 실패:", e);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      await supabase.from("routines").delete().eq("id", routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      setRoutineLogs((prev) => prev.filter((l) => l.routine_id !== routineId));
    } catch (e) {
      console.error("루틴 삭제 실패:", e);
    }
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }
    if (notifStatus === "granted") {
      alert("✅ 이미 알림이 설정되어 있습니다!\n일정 시작 30분 전과 종료 시간에 알림이 옵니다.");
      return;
    }
    setNotifStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotifStatus("granted");
        alert("✅ 알림 설정 완료!\n일정 시작 30분 전과 종료 시간에 정확히 알림이 옵니다.\n(앱을 열어두면 작동합니다)");
      } else {
        setNotifStatus("denied");
        alert("알림이 차단되었습니다.\n브라우저 주소창 왼쪽 자물쇠 아이콘을 눌러 알림을 허용해 주세요.");
      }
    } catch (err) {
      console.error("알림 설정 실패:", err);
      setNotifStatus("idle");
    }
  };

  const formatForInput = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return "";
    }
  };

  const formatDisplay = (isoStr: string) => {
    const d = new Date(isoStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hour}시${minute !== "00" ? ` ${minute}분` : ""}`;
  };

  const handleAIAutoFill = async () => {
    if (!rawInput.trim()) {
      alert("먼저 일정 내용을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setPendingSchedules([]);
    try {
      const res = await fetch("/api/ai-parse-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: rawInput.trim() }),
      });
      const result = await res.json() as ParsedSchedule[] | { error: string };
      if (!res.ok) {
        throw new Error(("error" in result ? result.error : null) || "AI 분석에 실패했습니다.");
      }
      if (!Array.isArray(result)) {
        throw new Error("AI 응답 형식이 올바르지 않습니다.");
      }

      if (result.length === 1) {
        // 일정 1개: 기존처럼 폼에 채워주기
        const item = result[0];
        if (item.title) setRawInput(item.title);
        if (item.desc) setDescription(item.desc);
        const start = formatForInput(item.start);
        const end = formatForInput(item.end);
        if (start) setStartTime(start);
        if (end) setEndTime(end);
      } else {
        // 일정 여러 개: 미리보기 목록으로 보여주기
        setPendingSchedules(result);
      }
    } catch (e) {
      console.error("AI 자동완성 실패:", e);
      alert(`AI 분석 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllPending = async () => {
    if (!user?.id || pendingSchedules.length === 0) return;
    setSavingAll(true);
    try {
      const rows = pendingSchedules.map((s) => ({
        title: s.title,
        description: s.desc || "",
        start_time: formatForInput(s.start) || new Date().toISOString(),
        end_time: formatForInput(s.end) || new Date().toISOString(),
        user_id: user.id,
        is_completed: false,
      }));
      const { error } = await supabase.from("todos").insert(rows);
      if (error) {
        alert(`저장 실패: ${error.message}`);
        return;
      }
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
      setPendingSchedules([]);
      setRawInput("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      await fetchTodos(user.id);
    } catch (e) {
      console.error("일괄 저장 실패:", e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleRemovePending = (idx: number) => {
    setPendingSchedules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddTodo = async () => {
    if (!rawInput.trim()) return alert("제목을 입력하세요.");
    if (!user?.id) return alert("로그인이 필요합니다.");
    const { error } = await supabase.from("todos").insert([
      {
        title: rawInput.trim(),
        description: description.trim(),
        start_time: startTime || new Date().toISOString(),
        end_time: endTime || new Date().toISOString(),
        user_id: user.id,
        is_completed: false,
      },
    ]);
    if (error) {
      alert(`저장 실패: ${error.message}`);
      return;
    }
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    setRawInput("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    await fetchTodos(user.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (!error && user?.id) await fetchTodos(user.id);
  };

  const handleEditStart = (todo: Todo) => {
    setEditingId(todo.id);
    setEditData({
      title: todo.title,
      description: todo.description || "",
      start_time: formatForInput(todo.start_time),
      end_time: formatForInput(todo.end_time),
    });
  };

  const handleEditSave = async () => {
    if (!editData.title.trim()) return alert("제목을 입력하세요.");
    if (!editingId || !user?.id) return;
    const { error } = await supabase
      .from("todos")
      .update({
        title: editData.title.trim(),
        description: editData.description.trim(),
        start_time: editData.start_time || new Date().toISOString(),
        end_time: editData.end_time || new Date().toISOString(),
      })
      .eq("id", editingId);
    if (!error) {
      setEditingId(null);
      await fetchTodos(user.id);
    }
  };

  const handleToggle = async (todo: Todo) => {
    const completing = !todo.is_completed;
    await supabase.from("todos").update({ is_completed: completing }).eq("id", todo.id);
    if (completing) {
      confetti({
        particleCount: 200,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#22C55E", "#86EFAC", "#BBF7D0", "#FDE68A", "#FCA5A5"],
      });
    }
    if (user?.id) await fetchTodos(user.id);
  };

  const applyTemplateToForm = (template: PlanTemplate) => {
    setRawInput(template.payload.rawInput);
    setDescription(template.payload.description);
    setStartTime(template.payload.startTime);
    setEndTime(template.payload.endTime);
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!rawInput.trim()) {
      alert("템플릿으로 저장할 제목을 먼저 입력해 주세요.");
      return;
    }

    const template: PlanTemplate = {
      id: `user-${Date.now()}`,
      title: rawInput.trim(),
      description: description.trim() || "사용자가 저장한 템플릿",
      category: "내 템플릿",
      payload: {
        rawInput: rawInput.trim(),
        description: description.trim(),
        startTime,
        endTime,
      },
    };

    const nextTemplates = [template, ...userTemplates].slice(0, 20);
    setUserTemplates(nextTemplates);
    localStorage.setItem(LOCAL_TEMPLATE_KEY, JSON.stringify(nextTemplates));
    alert("내 템플릿으로 저장했습니다.");
  };

  const handleDeleteUserTemplate = (templateId: string) => {
    const nextTemplates = userTemplates.filter((template) => template.id !== templateId);
    setUserTemplates(nextTemplates);
    localStorage.setItem(LOCAL_TEMPLATE_KEY, JSON.stringify(nextTemplates));
  };

  // 달력 날짜 클릭 → 필터 + 빠른 추가 준비
  const handleCalendarSelect = (day: Date | undefined) => {
    setCalendarDate(day);
    setQuickTitle("");
    if (day) {
      const yyyy = day.getFullYear();
      const mm = String(day.getMonth() + 1).padStart(2, "0");
      const dd = String(day.getDate()).padStart(2, "0");
      setStartTime(`${yyyy}-${mm}-${dd}T09:00`);
      setEndTime(`${yyyy}-${mm}-${dd}T10:00`);
    }
  };

  // 달력 아래 빠른 일정 추가
  const handleQuickAdd = async () => {
    if (!quickTitle.trim() || !calendarDate || !user?.id) return;
    setQuickSaving(true);
    try {
      const yyyy = calendarDate.getFullYear();
      const mm = String(calendarDate.getMonth() + 1).padStart(2, "0");
      const dd = String(calendarDate.getDate()).padStart(2, "0");
      const { error } = await supabase.from("todos").insert([{
        title: quickTitle.trim(),
        description: "",
        start_time: `${yyyy}-${mm}-${dd}T09:00:00`,
        end_time: `${yyyy}-${mm}-${dd}T10:00:00`,
        user_id: user.id,
        is_completed: false,
      }]);
      if (error) { alert(`저장 실패: ${error.message}`); return; }
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      setQuickTitle("");
      await fetchTodos(user.id);
    } catch (e) {
      console.error("빠른 추가 실패:", e);
    } finally {
      setQuickSaving(false);
    }
  };

  // 일정 있는 날짜 목록 (달력 닷 표시용)
  const todoDates = useMemo(() => {
    return todos.map((t) => {
      const d = new Date(t.start_time);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }, [todos]);

  // 선택한 날짜의 일정만 필터
  const filteredTodos = useMemo(() => {
    if (!calendarDate) return todos;
    return todos.filter((t) => {
      const d = new Date(t.start_time);
      return (
        d.getFullYear() === calendarDate.getFullYear() &&
        d.getMonth() === calendarDate.getMonth() &&
        d.getDate() === calendarDate.getDate()
      );
    });
  }, [todos, calendarDate]);


  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-900">
      {/* 전체 최대 너비 컨테이너 */}
      <div className="max-w-md md:max-w-6xl mx-auto px-4 md:px-10 pb-20">

        {/* 헤더 */}
        <header className="flex justify-between items-center py-6 md:py-10">
          <div>
            <h1 className="text-[30px] md:text-[48px] font-black text-[#1A202C] tracking-tighter italic uppercase">
              AI Planner
            </h1>
            {user && (
              <p className="text-[12px] md:text-[15px] font-bold text-[#22C55E] mt-0.5">
                반갑습니다, {user.email?.split("@")[0]}님!
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/docs"
              className="text-[10px] md:text-[12px] font-bold text-slate-400 hover:text-emerald-600 underline-offset-2 hover:underline shrink-0"
            >
              문서
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => void handleEnableNotifications()}
                disabled={notifStatus === "loading" || notifStatus === "granted"}
                title={notifStatus === "granted" ? "알림 설정됨" : "일정 알림 받기"}
                className={`px-3 py-2 rounded-2xl flex items-center gap-1.5 text-[12px] md:text-[13px] font-bold transition-all active:scale-95 ${
                  notifStatus === "granted"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : notifStatus === "denied"
                    ? "bg-red-100 text-red-500 border border-red-300"
                    : notifStatus === "loading"
                    ? "bg-slate-100 text-slate-400 animate-pulse"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                }`}
              >
                <span className="text-[15px]">{notifStatus === "granted" ? "🔔" : notifStatus === "denied" ? "🔕" : "🔔"}</span>
                <span>{notifStatus === "granted" ? "알림ON" : notifStatus === "denied" ? "차단됨" : "알림"}</span>
              </button>
            )}
            {user ? (
              <button
                type="button"
                onClick={() =>
                  supabase.auth.signOut().then(() => {
                    window.location.href = "/login";
                  })
                }
                className="text-[11px] md:text-[14px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                로그아웃
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="text-[11px] md:text-[14px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </header>

        {/* 앱 소개 배너 (인증 확인 후 비로그인 상태에서만 표시) */}
        {authLoaded && !user && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-3xl p-6 border border-emerald-100">
            <p className="text-[13px] md:text-[15px] font-black text-emerald-700 mb-1">✨ AI가 내 일정을 자동으로 정리해 드립니다</p>
            <p className="text-[11px] md:text-[13px] text-slate-500 leading-relaxed">
              말하듯 입력하면 AI가 날짜·시간·메모로 자동 분리 저장 →{" "}
              일정 30분 전 핸드폰 알림 → 지난 일정은 빨간 표시로 한눈에 확인
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = "/signup"; }}
              className="mt-3 px-5 py-2 bg-emerald-500 text-white text-[12px] md:text-[13px] font-black rounded-xl hover:bg-emerald-600 transition-all active:scale-95"
            >
              무료로 시작하기 →
            </button>
          </div>
        )}

        {/* 데스크탑: 2컬럼 그리드 / 모바일: 단일 컬럼 */}
        <div className="md:grid md:grid-cols-[1.1fr_1fr] md:gap-8 md:items-start">

          {/* ── 왼쪽 컬럼: 입력 폼 + 다중 일정 미리보기 + 템플릿 ── */}
          <div>

            {/* 일정 입력 카드 */}
            <div className="bg-white rounded-[32px] p-7 md:p-10 shadow-2xl mb-8 border border-white">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <span className="text-[10px] md:text-[13px] font-black text-slate-300 uppercase tracking-widest">
                  Plan Details
                </span>
                <button
                  type="button"
                  onClick={() => void handleAIAutoFill()}
                  disabled={loading}
                  className="text-[12px] md:text-[14px] font-bold bg-[#F0FDF4] text-[#22C55E] px-5 md:px-7 py-2.5 md:py-3 rounded-full active:scale-95 transition-all disabled:opacity-50"
                >
                  ✨ {loading ? "분석 중..." : "AI 자동완성"}
                </button>
              </div>
              <div className="space-y-5 md:space-y-6">
                {!user && (
                  <p className="text-[12px] md:text-[14px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 md:px-4 md:py-3">
                    일정 저장은 로그인 후 가능합니다. 먼저 로그인해 주세요.
                  </p>
                )}
                <input
                  className="w-full p-4 md:p-5 bg-[#F8F9FD] rounded-2xl text-[19px] md:text-[24px] font-black outline-none border-none"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="일정 제목 또는 자연어 입력"
                />
                <textarea
                  className="w-full p-4 md:p-5 bg-[#F8F9FD] rounded-2xl text-[14px] md:text-[16px] text-slate-500 font-medium outline-none border-none resize-none whitespace-pre-line"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="상세 내용 (AI 자동완성 시 자동 입력)"
                />
                <div className="flex gap-3 md:gap-4">
                  <DateTimePicker
                    value={startTime}
                    onChange={setStartTime}
                    label="시작"
                    placeholder="날짜 선택"
                  />
                  <DateTimePicker
                    value={endTime}
                    onChange={setEndTime}
                    label="마감"
                    labelColor="text-rose-400"
                    placeholder="날짜 선택"
                    timeColor="text-rose-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddTodo()}
                  disabled={!user}
                  className="w-full bg-[#1A202C] text-white py-5 md:py-6 rounded-3xl font-bold text-[18px] md:text-[22px] shadow-xl active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {user ? "일정 저장하기 🎊" : "로그인 후 저장 가능"}
                </button>
              </div>
            </div>

            {/* 다중 일정 감지 미리보기 */}
            {pendingSchedules.length > 0 && (
              <div className="bg-white rounded-[28px] p-5 md:p-8 shadow-xl border-2 border-emerald-200 mb-8">
                <div className="flex items-center justify-between mb-3 md:mb-5">
                  <div>
                    <p className="text-[12px] md:text-[15px] font-black text-emerald-600 uppercase tracking-widest">
                      ✨ 일정 {pendingSchedules.length}개 감지됨
                    </p>
                    <p className="text-[11px] md:text-[13px] text-slate-400 mt-0.5">개별 × 버튼으로 제거 후 일괄 저장</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingSchedules([])}
                    className="text-[11px] md:text-[13px] text-slate-400 font-bold"
                  >
                    닫기
                  </button>
                </div>
                <div className="space-y-2 md:space-y-3 mb-4">
                  {pendingSchedules.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-[#F8F9FD] rounded-2xl p-3 md:p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] md:text-[17px] font-black text-slate-800 truncate">{s.title}</p>
                        {s.desc && (
                          <p className="text-[11px] md:text-[13px] text-slate-400 mt-0.5 line-clamp-1">{s.desc}</p>
                        )}
                        <p className="text-[11px] md:text-[13px] font-bold text-emerald-600 mt-1">
                          {s.start ? formatDisplay(s.start) : "시간 미정"}{" "}
                          {s.end && s.end !== s.start ? `→ ${formatDisplay(s.end)}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(idx)}
                        className="text-[18px] md:text-[22px] text-slate-300 hover:text-rose-400 shrink-0 mt-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveAllPending()}
                  disabled={!user || savingAll}
                  className="w-full bg-emerald-500 text-white py-4 md:py-5 rounded-2xl font-bold text-[16px] md:text-[19px] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingAll ? "저장 중..." : user ? `${pendingSchedules.length}개 일정 모두 저장 🎊` : "로그인 후 저장 가능"}
                </button>
              </div>
            )}

            {/* 템플릿 마켓 */}
            <div className="bg-white rounded-[28px] p-5 md:p-8 shadow-sm border border-white mb-8">
              <div className="flex items-center justify-between mb-3 md:mb-5">
                <p className="text-[11px] md:text-[14px] font-black text-slate-400 uppercase tracking-widest">Template Market</p>
                <button
                  type="button"
                  onClick={handleSaveCurrentAsTemplate}
                  className="text-[11px] md:text-[13px] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  내 템플릿 저장
                </button>
              </div>

              {/* 프리미엄 업그레이드 배너 */}
              <div className="bg-gradient-to-r from-[#1A202C] to-[#2D3748] rounded-2xl p-4 md:p-5 mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] md:text-[13px] font-black text-yellow-400 uppercase tracking-widest mb-1">
                    ✦ Premium
                  </p>
                  <p className="text-[13px] md:text-[15px] font-bold text-white leading-snug">
                    🔒 프리미엄 템플릿 6개 포함
                  </p>
                  <p className="text-[11px] md:text-[12px] text-slate-400 mt-0.5">
                    AI 무제한 · 알림 · 주간 리포트
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert("프리미엄 기능 준비 중입니다! 곧 오픈됩니다 🚀")}
                  className="shrink-0 bg-yellow-400 text-[#1A202C] text-[12px] md:text-[14px] font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all"
                >
                  월 4,900원
                </button>
              </div>

              <div className="space-y-3">
                {[...BASIC_TEMPLATES, ...userTemplates].map((template) => (
                  <div
                    key={template.id}
                    className={`rounded-2xl border p-3 md:p-4 ${template.isPremium ? "border-yellow-100 bg-yellow-50/50" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {template.isPremium && <span className="text-[11px]">🔒</span>}
                          <p className={`text-[13px] md:text-[16px] font-black truncate ${template.isPremium ? "text-slate-400" : "text-slate-800"}`}>
                            {template.title}
                          </p>
                        </div>
                        <p className="text-[11px] md:text-[13px] text-slate-400 mt-1 line-clamp-2">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-block text-[10px] md:text-[12px] font-bold px-2 py-0.5 rounded-full ${template.isPremium ? "text-yellow-700 bg-yellow-100" : "text-emerald-700 bg-emerald-100"}`}>
                            {template.isPremium ? "👑 프리미엄" : template.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {template.isPremium ? (
                          <button
                            type="button"
                            onClick={() => alert("프리미엄 기능 준비 중입니다! 곧 오픈됩니다 🚀")}
                            className="text-[11px] md:text-[13px] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-yellow-100 text-yellow-700"
                          >
                            🔒 잠금
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => applyTemplateToForm(template)}
                            className="text-[11px] md:text-[13px] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#1A202C] text-white"
                          >
                            적용
                          </button>
                        )}
                        {template.category === "내 템플릿" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUserTemplate(template.id)}
                            className="text-[10px] md:text-[12px] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-rose-100 text-rose-600"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* ── 왼쪽 컬럼 끝 ── */}

          {/* ── 오른쪽 컬럼: 달력 + 일정 목록 ── */}
          <div>

            {/* 오늘의 명언 (달력 바로 위) */}
            <div className="bg-gradient-to-r from-[#1A202C] to-[#2D3748] rounded-[24px] px-5 py-4 md:px-7 md:py-5 mb-4">
              <p className="text-[10px] md:text-[12px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">
                ✦ 오늘의 명언
              </p>
              <p className="text-[13px] md:text-[16px] font-bold text-white leading-snug">
                &ldquo;{todayQuote.text}&rdquo;
              </p>
              <p className="text-[11px] md:text-[13px] text-slate-400 font-medium mt-1.5 text-right">
                — {todayQuote.author}
              </p>
            </div>

            {/* 월간 달력 카드 */}
            <div className="bg-white rounded-[28px] p-5 md:p-7 shadow-sm border border-white mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] md:text-[14px] font-black text-slate-400 uppercase tracking-widest">
                  📅 Monthly Plan
                </p>
                {calendarDate && (
                  <button
                    type="button"
                    onClick={() => setCalendarDate(undefined)}
                    className="text-[11px] md:text-[13px] font-bold text-white bg-emerald-500 px-4 py-1.5 rounded-full shadow-sm active:scale-95 transition-all"
                  >
                    ← 전체 보기
                  </button>
                )}
              </div>
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={handleCalendarSelect}
                modifiers={{ hasTodo: todoDates }}
                modifiersClassNames={{
                  hasTodo: "after:content-[''] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-emerald-500 after:rounded-full relative",
                }}
                className="w-full [--cell-size:--spacing(9)] md:[--cell-size:--spacing(10)]"
              />

              {/* 달력 날짜 클릭 후 빠른 일정 추가 */}
              {calendarDate && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[12px] md:text-[14px] font-black text-slate-600 mb-2">
                    📌 {calendarDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                    <span className="ml-2 text-emerald-600">({filteredTodos.length}개)</span>
                  </p>
                  {user ? (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-[#F8F9FD] rounded-xl px-3 py-2.5 text-[13px] md:text-[15px] font-bold outline-none border-none placeholder:text-slate-300"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleQuickAdd(); }}
                        placeholder="일정 제목 입력 후 Enter"
                      />
                      <button
                        type="button"
                        onClick={() => void handleQuickAdd()}
                        disabled={!quickTitle.trim() || quickSaving}
                        className="bg-[#1A202C] text-white px-4 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40 active:scale-95 transition-all shrink-0"
                      >
                        {quickSaving ? "..." : "추가"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[12px] text-amber-600 font-bold bg-amber-50 rounded-xl px-3 py-2">
                      일정 추가는 로그인 후 가능합니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 오늘의 루틴 섹션 */}
            {user && (
              <div className="bg-white rounded-[28px] p-5 md:p-7 shadow-sm border border-white mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] md:text-[14px] font-black text-slate-400 uppercase tracking-widest">
                      🔁 Today&apos;s Routine
                    </p>
                    {routines.length > 0 && (
                      <p className="text-[11px] md:text-[13px] text-slate-400 mt-0.5">
                        {routineLogs.filter((l) => l.done_date === todayStr).length}/{routines.length} 완료
                        {" "}
                        {routines.length > 0 && Math.round((routineLogs.filter((l) => l.done_date === todayStr).length / routines.length) * 100)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* 완료율 바 */}
                {routines.length > 0 && (
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((routineLogs.filter((l) => l.done_date === todayStr).length / routines.length) * 100)}%` }}
                    />
                  </div>
                )}

                {/* 루틴 목록 */}
                {routines.length === 0 ? (
                  <p className="text-center text-slate-300 font-bold text-[13px] py-4">
                    아직 루틴이 없어요. 아래에서 추가해보세요!
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {routines.map((routine) => {
                      const isDone = routineLogs.some((l) => l.routine_id === routine.id && l.done_date === todayStr);
                      return (
                        <div
                          key={routine.id}
                          className={`flex items-center gap-3 rounded-2xl p-3 md:p-4 transition-all ${isDone ? "bg-emerald-50" : "bg-[#F8F9FD]"}`}
                        >
                          <button
                            type="button"
                            onClick={() => void handleToggleRoutine(routine.id)}
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[18px] md:text-[20px] shrink-0 border-2 transition-all active:scale-90 ${isDone ? "border-emerald-400 bg-emerald-400" : "border-slate-200 bg-white"}`}
                          >
                            {isDone ? "✓" : ""}
                          </button>
                          <span className="text-[17px] md:text-[20px] shrink-0">{routine.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[14px] md:text-[16px] font-bold transition-all ${isDone ? "line-through text-slate-300" : "text-slate-700"}`}>
                              {routine.title}
                            </span>
                            {(routine.routine_time || routine.routine_end_time) && (
                              <p className={`text-[11px] md:text-[13px] font-bold mt-0.5 ${isDone ? "text-slate-300" : "text-emerald-500"}`}>
                                {routine.routine_time && `⏰ ${routine.routine_time}`}
                                {routine.routine_time && routine.routine_end_time && " → "}
                                {routine.routine_end_time && `${routine.routine_end_time}`}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRoutine(routine.id)}
                            className="text-slate-200 hover:text-rose-400 text-[18px] shrink-0 transition-all"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 루틴 추가 입력 */}
                <div className="space-y-2 mt-2">
                  {/* 이모지 선택 버튼 */}
                  <div className="bg-[#F8F9FD] rounded-2xl p-3">
                    {[
                      { label: "☀️ 아침·날씨", emojis: ["☀️","🌅","🌄","🌤️","🌧️","❄️","🌈","🌞","🌙","⭐"] },
                      { label: "🏃 운동·스포츠", emojis: ["🚶","🏃","💪","🧘","🚴","🏋️","⚽","🏀","🏸","🎾","🏊","🤸","🥊","⛳","🛹"] },
                      { label: "💻 공부·업무", emojis: ["💻","📖","📝","✏️","🎓","📚","🔬","📊","🗒️","🖥️"] },
                      { label: "🥗 식사·건강", emojis: ["🥗","🍳","☕","🥛","🍎","💊","🥦","🍱","🫖","🧃"] },
                      { label: "🙏 마음·힐링", emojis: ["🙏","❤️","😌","🌿","🕊️","✨","🧠","💭","😊","🫶"] },
                      { label: "🎵 취미·여가", emojis: ["🎵","🎸","🎹","🎬","🎮","📺","🎨","📷","🎤","🎭"] },
                      { label: "🛌 수면·위생", emojis: ["🚿","🛌","😴","💆","🛁","🪥","🧹","💤","🌛","😪"] },
                      { label: "📧 일상·관리", emojis: ["📧","💌","📱","📞","🗓️","✅","🎯","💰","📈","⏰"] },
                    ].map((cat) => (
                      <div key={cat.label} className="mb-2 last:mb-0">
                        <p className="text-[10px] font-black text-slate-300 tracking-widest mb-1 px-0.5">{cat.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {cat.emojis.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => setRoutineEmoji(e)}
                              className={`text-[20px] w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${routineEmoji === e ? "bg-emerald-100 ring-2 ring-emerald-400 scale-110" : "hover:bg-white"}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 flex items-center justify-center bg-[#F8F9FD] rounded-xl text-[22px] shrink-0">
                      {routineEmoji}
                    </div>
                    <input
                      className="flex-1 bg-[#F8F9FD] rounded-xl px-3 py-2.5 text-[13px] md:text-[15px] font-bold outline-none border-none placeholder:text-slate-300"
                      value={newRoutineTitle}
                      onChange={(e) => setNewRoutineTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleAddRoutine(); }}
                      placeholder="루틴 이름 입력 (예: 기상, 운동, 독서)"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-1 items-center bg-[#F8F9FD] rounded-xl px-3 py-2">
                      <span className="text-[11px] text-slate-400 font-bold shrink-0">시작</span>
                      <input
                        type="time"
                        className="flex-1 bg-transparent text-[13px] md:text-[14px] font-bold text-slate-700 outline-none border-none"
                        value={routineTime}
                        onChange={(e) => setRoutineTime(e.target.value)}
                      />
                    </div>
                    <span className="text-slate-300 font-bold">→</span>
                    <div className="flex-1 flex gap-1 items-center bg-[#F8F9FD] rounded-xl px-3 py-2">
                      <span className="text-[11px] text-rose-400 font-bold shrink-0">종료</span>
                      <input
                        type="time"
                        className="flex-1 bg-transparent text-[13px] md:text-[14px] font-bold text-slate-700 outline-none border-none"
                        value={routineEndTime}
                        onChange={(e) => setRoutineEndTime(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddRoutine()}
                      disabled={!newRoutineTitle.trim()}
                      className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-[14px] active:scale-95 transition-all disabled:opacity-40 shrink-0"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[10px] md:text-[13px] font-black text-slate-300 uppercase tracking-widest px-1">
                {calendarDate
                  ? `${calendarDate.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} 일정 (${filteredTodos.length})`
                  : `My Plan List (${todos.length})`}
              </p>

              {filteredTodos.length === 0 && (
                <p className="text-center text-slate-300 font-bold text-sm md:text-base py-10 md:py-20">
                  {calendarDate ? "이 날 등록된 일정이 없습니다." : "등록된 일정이 없습니다."}
                </p>
              )}

        {filteredTodos.map((todo) => (
          <div key={todo.id} className="bg-white rounded-[28px] shadow-sm border border-white overflow-hidden">
            {editingId === todo.id ? (
              <div className="p-6 md:p-8 space-y-3 md:space-y-4">
                <input
                  className="w-full p-3 md:p-4 bg-[#F8F9FD] rounded-xl text-[16px] md:text-[19px] font-black outline-none"
                  value={editData.title}
                  onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="제목"
                />
                <textarea
                  className="w-full p-3 md:p-4 bg-[#F8F9FD] rounded-xl text-[13px] md:text-[15px] text-slate-500 outline-none resize-none"
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="상세 내용"
                />
                <div className="flex gap-2">
                  <DateTimePicker
                    value={editData.start_time}
                    onChange={(v) => setEditData((p) => ({ ...p, start_time: v }))}
                    label="시작"
                    placeholder="날짜 선택"
                  />
                  <DateTimePicker
                    value={editData.end_time}
                    onChange={(v) => setEditData((p) => ({ ...p, end_time: v }))}
                    label="마감"
                    labelColor="text-rose-400"
                    placeholder="날짜 선택"
                    timeColor="text-rose-500"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleEditSave()}
                    className="flex-1 bg-[#1A202C] text-white py-3 rounded-2xl font-bold text-[14px] active:scale-95 transition-all"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 bg-[#F8F9FD] text-slate-400 py-3 rounded-2xl font-bold text-[14px] active:scale-95 transition-all"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => void handleToggle(todo)}
                      className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all active:scale-90 ${todo.is_completed ? "bg-[#22C55E] border-[#22C55E] shadow-md shadow-green-200" : "border-slate-200 hover:border-green-300"}`}
                    >
                      {todo.is_completed && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0" style={{ overflow: "hidden" }}>
                      <h3
                        className={`text-[15px] md:text-[17px] font-black tracking-tight leading-snug transition-all ${todo.is_completed ? "line-through text-slate-300" : "text-slate-800"}`}
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-all",
                        }}
                      >
                        {todo.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditStart(todo)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all active:scale-90"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(todo.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {todo.description && (
                  <p className="text-[13px] md:text-[15px] text-slate-400 font-medium mt-3 whitespace-pre-line leading-relaxed">
                    {todo.description}
                  </p>
                )}

                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] md:text-[12px] font-black text-blue-500 uppercase">START</span>
                    <span className="text-[14px] md:text-[16px] font-black text-slate-700">
                      {formatDisplay(todo.start_time)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] md:text-[12px] font-black text-rose-400 uppercase">END</span>
                    <span className="text-[14px] md:text-[16px] font-black text-slate-700">
                      {formatDisplay(todo.end_time)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
            </div>{/* space-y-4 끝 */}
          </div>{/* 오른쪽 컬럼 끝 */}

        </div>{/* md:grid 끝 */}
      </div>{/* 최대 너비 컨테이너 끝 */}
    </div>
  );
};

export default TodoPage;
