/**
 * 할 일 추가/편집 폼 컴포넌트
 * AI 자연어 파싱 기능 포함
 */
'use client';

import { useState } from 'react';
import { Todo, TodoInsert, Priority } from '@/types/todo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodoFormProps {
  todo?: Todo;
  onSubmit: (data: TodoInsert) => Promise<void>;
  onCancel?: () => void;
}

/**
 * 기존 할 일의 due_date(UTC ISO)에서 KST 시간 문자열(HH:mm) 추출
 */
const extractKstTime = (dueDateIso: string): string => {
  const d = new Date(dueDateIso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const h = kst.getUTCHours().toString().padStart(2, '0');
  const m = kst.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const TodoForm = ({ todo, onSubmit, onCancel }: TodoFormProps) => {
  const [title, setTitle] = useState(todo?.title || '');
  const [description, setDescription] = useState(todo?.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    if (!todo?.due_date) return undefined;
    const d = new Date(todo.due_date);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  });
  const [startTime, setStartTime] = useState<string>(() => {
    if (!todo?.start_date) return '09:00';
    return extractKstTime(todo.start_date);
  });
  const [dueTime, setDueTime] = useState<string>(() => {
    if (!todo?.due_date) return '18:00';
    return extractKstTime(todo.due_date);
  });
  const [priority, setPriority] = useState<Priority>(todo?.priority || 'medium');
  const [categoryInput, setCategoryInput] = useState(todo?.category.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** AI 자연어 입력 관련 상태 */
  const [aiInput, setAiInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);

  /**
   * AI 자연어 파싱 핸들러
   */
  const handleAiParse = async () => {
    if (!aiInput.trim()) {
      setAiError('분석할 내용을 입력해 주세요.');
      return;
    }

    setAiError(null);
    setAiSuccess(false);
    setIsAiParsing(true);

    try {
      const res = await fetch('/api/ai-parse-todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'AI 분석에 실패했습니다.');
      }

      // 파싱 결과를 폼 필드에 반영
      if (data.title) setTitle(data.title);
      if (data.priority) setPriority(data.priority as Priority);
      if (data.category?.length) setCategoryInput((data.category as string[]).join(', '));

      if (data.due_date && /^\d{4}-\d{2}-\d{2}$/.test(data.due_date)) {
        const [y, m, d] = data.due_date.split('-').map(Number);
        setDueDate(new Date(y, m - 1, d));
      }

      if (data.start_time) {
        setStartTime(data.start_time);
      }
      if (data.due_time) {
        setDueTime(data.due_time);
      }

      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch (err) {
      console.error('AI 파싱 요청 실패:', err);
      setAiError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsAiParsing(false);
    }
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const categories = categoryInput
        .split(',')
        .map((cat: any) => cat.trim())
        .filter((cat: any) => cat.length > 0);

      // 날짜 + 시간 → KST 기준 ISO 문자열 생성
      let startDateValue: string | null = null;
      let dueDateValue: string | null = null;
      if (dueDate) {
        const dateStr = format(dueDate, 'yyyy-MM-dd');
        startDateValue = new Date(`${dateStr}T${startTime}:00+09:00`).toISOString();
        dueDateValue   = new Date(`${dateStr}T${dueTime}:00+09:00`).toISOString();
      }

      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDateValue,
        due_date: dueDateValue,
        priority,
        category: categories,
        completed: todo?.completed || false,
      });

      // 성공 시 폼 초기화
      if (!todo) {
        setTitle('');
        setDescription('');
        setDueDate(undefined);
        setStartTime('09:00');
        setDueTime('18:00');
        setPriority('medium');
        setCategoryInput('');
        setAiInput('');
      }
    } catch (err) {
      console.error('할 일 저장 실패:', err);
      setError(err instanceof Error ? err.message : '할 일을 저장할 수 없습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {/* AI 자연어 입력 섹션 (새 할 일 추가 시에만 표시) */}
      {!todo && (
        <div className="space-y-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-violet-700">
            <Sparkles className="h-4 w-4" />
            AI로 자동 입력
          </div>
          <Textarea
            value={aiInput}
            onChange={(e) => {
              setAiInput(e.target.value);
              if (aiError) setAiError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleAiParse();
              }
            }}
            placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
            rows={2}
            disabled={isAiParsing || isSubmitting}
            className="resize-none text-sm bg-white"
          />
          {aiError && (
            <p className="text-xs text-red-600">{aiError}</p>
          )}
          {aiSuccess && (
            <p className="text-xs text-violet-700 font-medium">✓ 폼 필드가 자동으로 채워졌습니다.</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAiParse}
            disabled={isAiParsing || isSubmitting || !aiInput.trim()}
            className="w-full border-violet-300 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
          >
            {isAiParsing ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" />
                분석 중...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                AI 분석하기
                <span className="text-xs opacity-60">(Ctrl+Enter)</span>
              </span>
            )}
          </Button>
        </div>
      )}

      {/* 제목 */}
      <div className="space-y-1.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <Label htmlFor="title" className="text-sm font-bold text-blue-800">
          📌 제목 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 팀 회의 준비"
          disabled={isSubmitting}
          required
          className="bg-white font-semibold text-base border-blue-300"
        />
      </div>

      {/* 설명 */}
      <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <Label htmlFor="description" className="text-sm font-medium text-gray-500">
          📝 설명 <span className="text-xs font-normal text-gray-400">(선택)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="상세 내용, 메모 등..."
          rows={2}
          disabled={isSubmitting}
          className="resize-none text-sm bg-white border-gray-300"
        />
      </div>

      <div className="space-y-2">
        <Label>마감일 및 시간</Label>

        {/* 날짜 선택 */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start text-left font-normal"
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate
                  ? `${format(dueDate, 'PPP', { locale: ko })}  ${startTime} ~ ${dueTime}`
                  : '날짜 선택 (선택)'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {dueDate && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setDueDate(undefined); setStartTime('09:00'); setDueTime('18:00'); }}
              disabled={isSubmitting}
              aria-label="날짜 초기화"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* 시작/마감 시간 — 24시간제 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 시작 시간 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">시작 시간</p>
            <div className="flex items-center gap-1">
              <Select
                value={startTime.split(':')[0]}
                onValueChange={(h) => setStartTime(`${h}:${startTime.split(':')[1] ?? '00'}`)}
                disabled={isSubmitting || !dueDate}
              >
                <SelectTrigger className="w-[4.5rem] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-52 overflow-y-auto">
                  {Array.from({ length: 24 }, (_, i) => {
                    const v = String(i).padStart(2, '0');
                    return <SelectItem key={v} value={v}>{v}시</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <span className="text-gray-400 text-sm">:</span>
              <Select
                value={startTime.split(':')[1] ?? '00'}
                onValueChange={(m) => setStartTime(`${startTime.split(':')[0] ?? '09'}:${m}`)}
                disabled={isSubmitting || !dueDate}
              >
                <SelectTrigger className="w-[4.5rem] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['00', '10', '20', '30', '40', '50'].map((m) => (
                    <SelectItem key={m} value={m}>{m}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 마감 시간 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">마감 시간</p>
            <div className="flex items-center gap-1">
              <Select
                value={dueTime.split(':')[0]}
                onValueChange={(h) => setDueTime(`${h}:${dueTime.split(':')[1] ?? '00'}`)}
                disabled={isSubmitting || !dueDate}
              >
                <SelectTrigger className="w-[4.5rem] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-52 overflow-y-auto">
                  {Array.from({ length: 24 }, (_, i) => {
                    const v = String(i).padStart(2, '0');
                    return <SelectItem key={v} value={v}>{v}시</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <span className="text-gray-400 text-sm">:</span>
              <Select
                value={dueTime.split(':')[1] ?? '00'}
                onValueChange={(m) => setDueTime(`${dueTime.split(':')[0] ?? '18'}:${m}`)}
                disabled={isSubmitting || !dueDate}
              >
                <SelectTrigger className="w-[4.5rem] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['00', '10', '20', '30', '40', '50'].map((m) => (
                    <SelectItem key={m} value={m}>{m}분</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!dueDate && (
          <p className="text-xs text-muted-foreground">
            날짜를 선택해야 시간을 설정할 수 있습니다.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">우선순위</Label>
        <Select value={priority} onValueChange={(value) => setPriority(value as Priority)} disabled={isSubmitting}>
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">높음</SelectItem>
            <SelectItem value="medium">보통</SelectItem>
            <SelectItem value="low">낮음</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Input
          id="category"
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          placeholder="업무, 개인, 학습 (쉼표로 구분)"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          여러 카테고리는 쉼표(,)로 구분하세요
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? '저장 중...' : todo ? '수정' : '추가'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
};
