// @ts-nocheck 
/**
* AI 요약 및 분석 섹션 컴포넌트
 * 오늘의 요약 / 이번 주 요약 탭에서 Gemini AI 분석 결과를 시각적으로 표시합니다.
 */
'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Todo, AiAnalysisResult } from '@/types/todo';

// ── 타입 ────────────────────────────────────────────────────────

type TabKey = 'today' | 'week';

interface AiSummarySectionProps {
  todos: Todo[];
}

// ── 상수 ────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high:   { label: '높음', className: 'bg-red-100 text-red-700 border border-red-200' },
  medium: { label: '보통', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  low:    { label: '낮음', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
} as const;

/** 인사이트 카드 색상 – 인덱스 % 5 로 순환 */
const INSIGHT_VARIANTS = [
  { emoji: '💡', bg: 'bg-blue-50',   border: 'border-blue-200',   title: '인사이트' },
  { emoji: '⚠️', bg: 'bg-amber-50',  border: 'border-amber-200',  title: '주의사항' },
  { emoji: '🎯', bg: 'bg-green-50',  border: 'border-green-200',  title: '목표' },
  { emoji: '📈', bg: 'bg-purple-50', border: 'border-purple-200', title: '트렌드' },
  { emoji: '🔍', bg: 'bg-gray-50',   border: 'border-gray-200',   title: '분석' },
] as const;

/** 요일 레이블 (월~일 순) */
const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
/** getUTCDay(0=일) → 월요일 기준 인덱스(0=월) */
const UTC_TO_MON_FIRST: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

// ── 날짜 유틸 ───────────────────────────────────────────────────

const getKstToday = (): string => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

const getKstWeekRange = (): { start: string; end: string } => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(kst);
  mon.setUTCDate(kst.getUTCDate() + diff);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
};

// ── 서브 컴포넌트 ───────────────────────────────────────────────

/** 로딩 스켈레톤 */
const AnalysisSkeleton = () => (
  <div className="space-y-4 pt-2 animate-in fade-in duration-300">
    <Skeleton className="h-28 w-full rounded-xl" />
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
    <Skeleton className="h-8 w-full rounded-lg" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
    </div>
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
    </div>
    <p className="text-center text-xs text-gray-400 pb-2">AI가 데이터를 분석하고 있습니다...</p>
  </div>
);

/** 완료율 진행바 */
const CompletionBar = ({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) => {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const barColor =
    rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-purple-500' : 'bg-amber-500';
  const rateColor =
    rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-purple-600' : 'text-amber-600';
  const message =
    rate >= 80 ? '🌟 훌륭해요!' : rate >= 50 ? '💪 잘 하고 있어요!' : '🔥 조금 더 힘내요!';

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
      <p className="text-xs font-semibold text-purple-600 mb-3 uppercase tracking-wide">
        📊 {label} 완료율
      </p>
      <div className="flex items-end gap-3 mb-3">
        <span className={`text-5xl font-bold tracking-tight leading-none ${rateColor}`}>
          {rate}%
        </span>
        <div className="mb-0.5 space-y-0.5">
          <p className="text-sm text-gray-600 font-medium">{completed}/{total}개 완료</p>
          <p className="text-xs font-medium text-gray-500">{message}</p>
        </div>
      </div>
      <div className="h-3 w-full bg-white/70 rounded-full overflow-hidden border border-purple-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
};

/** 통계 요약 카드 3개 */
const StatsRow = ({
  completed,
  total,
  overdueCount,
}: {
  completed: number;
  total: number;
  overdueCount: number;
}) => {
  const incomplete = total - completed;
  const stats = [
    { emoji: '✅', label: '완료', value: completed, color: 'text-green-600' },
    { emoji: '📋', label: '남은 할 일', value: incomplete, color: 'text-gray-700' },
    { emoji: '⚠️', label: '기한 초과', value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-base mb-0.5">{s.emoji}</span>
          <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
          <span className="text-xs text-gray-500 text-center leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

/** 오늘 집중 작업 + 남은 할 일 목록 */
const TodayTaskList = ({
  urgentTasks,
  incompleteTodos,
  today,
}: {
  urgentTasks: string[];
  incompleteTodos: Todo[];
  today: string;
}) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...incompleteTodos].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return (
    <div className="space-y-4">
      {/* AI 선정 집중 작업 */}
      {urgentTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px]">!</span>
            지금 집중해야 할 작업
          </p>
          <div className="space-y-1.5">
            {urgentTasks.map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
              >
                <span className="text-sm">🔥</span>
                <span className="text-sm text-gray-800 font-medium">{task}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 남은 할 일 목록 */}
      {sorted.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">📋 남은 할 일 ({sorted.length}개)</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {sorted.map((todo) => {
              const isOverdue = !!todo.due_date && todo.due_date.slice(0, 10) < today;
              const pc = PRIORITY_CONFIG[todo.priority];
              return (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
                    isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
                  }`}
                >
                  <span className="text-sm text-gray-700 truncate flex-1">{todo.title}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isOverdue && (
                      <span className="text-xs text-red-500 font-medium">기한초과</span>
                    )}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${pc.className}`}>
                      {pc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/** 이번 주 요일별 할 일 분포 차트 */
const WeekDowChart = ({ weekTodos, today }: { weekTodos: Todo[]; today: string }) => {
  const dowData = DOW_LABELS.map((label, monFirstIdx) => {
    // Mon-first index → getUTCDay: 0=월→1, 1=화→2, ..., 5=토→6, 6=일→0
    const utcDay = monFirstIdx === 6 ? 0 : monFirstIdx + 1;
    const dayTodos = weekTodos.filter(
      (t) => t.due_date && new Date(t.due_date).getUTCDay() === utcDay
    );
    const isToday =
      weekTodos.length > 0 &&
      dayTodos.some((t) => t.due_date?.slice(0, 10) === today);
    return {
      label,
      total: dayTodos.length,
      completed: dayTodos.filter((t) => t.completed).length,
      isToday,
    };
  });

  const maxTotal = Math.max(...dowData.map((d) => d.total), 1);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-3">📅 요일별 할 일 분포</p>
      <div className="flex items-end gap-1.5 h-24">
        {dowData.map((d, i) => {
          const barH = Math.max(Math.round((d.total / maxTotal) * 64), d.total > 0 ? 8 : 0);
          const fillPct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {d.total > 0 && (
                <span className="text-[10px] text-gray-500 font-medium">{d.total}</span>
              )}
              <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                {d.total > 0 ? (
                  <div
                    className={`w-full rounded-t-sm overflow-hidden relative ${
                      d.isToday ? 'ring-2 ring-purple-400 ring-offset-1' : ''
                    }`}
                    style={{ height: barH }}
                  >
                    {/* 미완료 배경 */}
                    <div className="absolute inset-0 bg-purple-100" />
                    {/* 완료 채움 */}
                    <div
                      className="absolute bottom-0 w-full bg-purple-500 transition-all duration-500"
                      style={{ height: `${fillPct}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-1 rounded bg-gray-100" />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  d.isToday ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span className="text-[11px] text-gray-500">완료</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-100 border border-purple-200" />
          <span className="text-[11px] text-gray-500">미완료</span>
        </div>
      </div>
    </div>
  );
};

/** AI 인사이트 카드 그리드 */
const InsightGrid = ({ insights }: { insights: string[] }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-2">인사이트</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {insights.map((insight, i) => {
        const v = INSIGHT_VARIANTS[i % INSIGHT_VARIANTS.length];
        return (
          <div
            key={i}
            className={`flex gap-2.5 p-3 rounded-lg border ${v.bg} ${v.border}`}
          >
            <span className="text-lg flex-shrink-0 leading-tight">{v.emoji}</span>
            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
          </div>
        );
      })}
    </div>
  </div>
);

/** 추천 사항 번호 목록 */
const RecommendationList = ({ recommendations }: { recommendations: string[] }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-2">🚀 실행 추천</p>
    <div className="space-y-2">
      {recommendations.map((rec, i) => (
        <div
          key={i}
          className="flex gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
        >
          <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[11px] font-bold mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
        </div>
      ))}
    </div>
  </div>
);

/** AI 요약 배너 */
const SummaryBanner = ({ summary }: { summary: string }) => (
  <div className="flex gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 border border-purple-100">
    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
      <Sparkles className="h-4 w-4 text-purple-600" />
    </div>
    <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
  </div>
);

// ── 메인 컴포넌트 ───────────────────────────────────────────────

export const AiSummarySection = ({ todos }: AiSummarySectionProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({ today: false, week: false });
  const [results, setResults] = useState<Record<TabKey, AiAnalysisResult | null>>({
    today: null,
    week: null,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    today: null,
    week: null,
  });

  const today = useMemo(() => getKstToday(), []);
  const weekRange = useMemo(() => getKstWeekRange(), []);

  /** 탭에 따라 할 일 필터링 (due_date 기준) */
  const filteredTodos = useMemo(() => {
    if (activeTab === 'today') {
      return todos.filter((t) => t.due_date?.slice(0, 10) === today);
    }
    return todos.filter((t) => {
      if (!t.due_date) return false;
      const d = t.due_date.slice(0, 10);
      return d >= weekRange.start && d <= weekRange.end;
    });
  }, [todos, activeTab, today, weekRange]);

  /** 클라이언트 사이드 통계 (시각화 전용) */
  const localStats = useMemo(() => {
    const completed = filteredTodos.filter((t) => t.completed).length;
    const total = filteredTodos.length;
    const incompleteTodos = filteredTodos.filter((t) => !t.completed);
    const overdueCount = incompleteTodos.filter(
      (t) => t.due_date && t.due_date.slice(0, 10) < today
    ).length;
    return { completed, total, incompleteTodos, overdueCount };
  }, [filteredTodos, today]);

  const handleAnalyze = async () => {
    const tab = activeTab;
    setLoading((prev) => ({ ...prev, [tab]: true }));
    setErrors((prev) => ({ ...prev, [tab]: null }));

    try {
      const res = await fetch('/api/ai-todos-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos: filteredTodos, period: tab }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'AI 분석에 실패했습니다.');
      }

      setResults((prev) => ({ ...prev, [tab]: data as AiAnalysisResult }));
    } catch (err) {
      console.error('AI 분석 요청 실패:', err);
      setErrors((prev) => ({
        ...prev,
        [tab]: err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다.',
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  };

  const currentResult = results[activeTab];
  const currentError = errors[activeTab];
  const isLoading = loading[activeTab];
  const todoCount = filteredTodos.length;
  const tabLabel = activeTab === 'today' ? '오늘' : '이번 주';

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <CardTitle className="text-base font-semibold">AI 요약 및 분석</CardTitle>
          {currentResult && (
            <Badge className="ml-auto bg-purple-100 text-purple-700 text-[11px] font-medium border-0">
              분석 완료
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 탭 */}
        <div className="flex gap-1 border-b">
          {(['today', 'week'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'today' ? '오늘의 요약' : '이번 주 요약'}
              {results[tab] && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500" />
              )}
            </button>
          ))}
        </div>

        {/* 분석 버튼 영역 */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {todoCount > 0 ? (
              <>
                <span className="font-medium text-gray-700">{todoCount}개</span>
                {' '}의 할 일 분석 준비 완료
              </>
            ) : (
              `${tabLabel} 마감인 할 일이 없습니다`
            )}
          </p>
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={isLoading || todoCount === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 flex-shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {currentResult ? 'AI 재분석' : 'AI 요약 보기'}
              </>
            )}
          </Button>
        </div>

        {/* 로딩 상태 */}
        {isLoading && <AnalysisSkeleton />}

        {/* 오류 상태 */}
        {currentError && !isLoading && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">{currentError}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAnalyze}
              disabled={todoCount === 0}
              className="self-start border-red-300 text-red-600 hover:bg-red-100 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              재시도
            </Button>
          </div>
        )}

        {/* 분석 결과 */}
        {currentResult && !isLoading && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* AI 요약 배너 */}
            <SummaryBanner summary={currentResult.summary} />

            {/* 완료율 진행바 */}
            <CompletionBar
              completed={localStats.completed}
              total={localStats.total}
              label={tabLabel}
            />

            {/* 통계 요약 3개 */}
            <StatsRow
              completed={localStats.completed}
              total={localStats.total}
              overdueCount={localStats.overdueCount}
            />

            {/* 오늘 전용: 집중 작업 + 남은 할 일 */}
            {activeTab === 'today' && (
              <TodayTaskList
                urgentTasks={currentResult.urgentTasks}
                incompleteTodos={localStats.incompleteTodos}
                today={today}
              />
            )}

            {/* 이번 주 전용: 요일별 분포 차트 */}
            {activeTab === 'week' && (
              <div className="p-4 rounded-xl bg-white border border-gray-100">
                <WeekDowChart weekTodos={filteredTodos} today={today} />
              </div>
            )}

            {/* 이번 주 전용: 긴급 작업 */}
            {activeTab === 'week' && currentResult.urgentTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px]">!</span>
                  이번 주 핵심 작업
                </p>
                <div className="space-y-1.5">
                  {currentResult.urgentTasks.map((task: any, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
                    >
                      <span className="text-sm">🔥</span>
                      <span className="text-sm text-gray-800 font-medium">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 인사이트 카드 그리드 */}
            {currentResult.insights.length > 0 && (
              <InsightGrid insights={currentResult.insights} />
            )}

            {/* 추천 사항 */}
            {currentResult.recommendations.length > 0 && (
              <RecommendationList recommendations={currentResult.recommendations} />
            )}
          </div>
        )}

        {/* 빈 초기 상태 */}
        {!currentResult && !currentError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 mb-4">
              <Sparkles className="h-7 w-7 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1.5">
              {tabLabel} 할 일을 AI로 분석해 보세요
            </p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              완료율 · 우선순위 분포 · 시간 패턴 · 실행 추천 사항을 한눈에 확인할 수 있습니다
            </p>
            {todoCount === 0 && (
              <div className="mt-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700">
                  💡 할 일에 마감일을 설정하면 분석 기능을 이용할 수 있어요
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
