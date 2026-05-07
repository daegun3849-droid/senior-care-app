/**
 * 개별 할 일을 표시하는 카드 컴포넌트
 * 생성일, AI 요약 생성 버튼 포함
 */
'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Todo } from '@/types/todo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Edit, Trash2, Sparkles, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodoCardProps {
  todo: Todo;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onAiSummaryUpdate?: (id: string, summary: string) => void;
}

/**
 * 우선순위에 따른 배지 색상 반환
 */
const getPriorityColor = (priority: Todo['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-destructive text-destructive-foreground';
    case 'medium':
      return 'bg-amber-500 text-white';
    case 'low':
      return 'bg-slate-500 text-white';
  }
};

/**
 * 우선순위 한글 레이블 반환
 */
const getPriorityLabel = (priority: Todo['priority']) => {
  switch (priority) {
    case 'high':
      return '높음';
    case 'medium':
      return '보통';
    case 'low':
      return '낮음';
  }
};

/**
 * 지연 여부 확인
 */
const isOverdue = (dueDate: string | null, completed: boolean) => {
  if (!dueDate || completed) return false;
  return new Date(dueDate) < new Date();
};

/**
 * UTC ISO → KST "HH:mm" 문자열 (24시간제)
 */
const toKstTime = (isoStr: string) => {
  const kst = new Date(new Date(isoStr).getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
};

/**
 * UTC ISO → KST "M월 d일" 문자열
 */
const toKstDate = (isoStr: string) => {
  const kst = new Date(new Date(isoStr).getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
};

/**
 * start_date / due_date → "4월 6일  11:00 ~ 14:00" 형태
 */
const formatDateTimeRange = (startDate: string | null, dueDate: string | null) => {
  const base = startDate ?? dueDate;
  if (!base) return '';
  const dateStr = toKstDate(base);
  if (startDate && dueDate) return `${dateStr}  ${toKstTime(startDate)} ~ ${toKstTime(dueDate)}`;
  if (startDate) return `${dateStr}  ${toKstTime(startDate)} ~`;
  return `${dateStr}  ~ ${toKstTime(dueDate!)}`;
};

export const TodoCard = ({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
  onAiSummaryUpdate,
}: TodoCardProps) => {
  const [isCompleted, setIsCompleted] = useState(todo.completed);
  const overdue = isOverdue(todo.due_date, isCompleted);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    setIsCompleted(todo.completed);
  }, [todo.completed]);

  const handleToggle = () => {
    const next = !isCompleted;
    setIsCompleted(next);
    if (next) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#6366f1', '#22c55e', '#facc15'],
      });
    }
    onToggleComplete(todo.id, next);
  };

  /**
   * AI 요약 생성 요청
   */
  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: todo.title, description: todo.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI 요약 생성 실패');
      onAiSummaryUpdate?.(todo.id, data.summary);
    } catch (err) {
      console.error('AI 요약 생성 오류:', err);
      setSummaryError(err instanceof Error ? err.message : 'AI 요약을 생성할 수 없습니다.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <Card className={`transition-all duration-200 ${overdue ? 'border-destructive' : ''} ${isCompleted ? 'opacity-60 bg-gray-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={handleToggle}
              className="mt-1.5 h-4 w-4 cursor-pointer accent-violet-600"
            />
            <div className="flex-1">
              <CardTitle className={`text-lg transition-all duration-200 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {todo.title}
              </CardTitle>
              {todo.description && (
                <p className="text-sm text-muted-foreground mt-1">{todo.description}</p>
              )}

              {/* AI 요약 표시 영역 */}
              {todo.ai_summary && (
                <div className="mt-2 flex items-start gap-1.5 rounded-md bg-violet-50 border border-violet-200 px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-700 leading-relaxed">{todo.ai_summary}</p>
                </div>
              )}

              {summaryError && (
                <p className="mt-1 text-xs text-destructive">{summaryError}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(todo)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(todo.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getPriorityColor(todo.priority)}>
            {getPriorityLabel(todo.priority)}
          </Badge>

          {(todo.start_date || todo.due_date) && (
            <Badge variant="outline" className={overdue ? 'border-destructive text-destructive' : ''}>
              <Calendar className="h-3 w-3 mr-1" />
              {formatDateTimeRange(todo.start_date, todo.due_date)}
              {overdue && ' (지연)'}
            </Badge>
          )}

            {todo.category.map((cat: any) => (
            <Badge key={cat} variant="secondary">
              {cat}
            </Badge>
          ))}
        </div>

        {/* 생성일 + AI 요약 버튼 */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>생성일 {format(new Date(todo.created_date), 'yyyy.MM.dd', { locale: ko })}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isSummarizing}
            className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 gap-1"
          >
            {isSummarizing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600 inline-block" />
                요약 중...
              </>
            ) : (
              <>
                {todo.ai_summary ? (
                  <RotateCcw className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI 요약
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
