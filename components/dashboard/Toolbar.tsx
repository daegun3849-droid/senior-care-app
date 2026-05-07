/**
 * 할 일 목록 툴바
 * 검색, 상태/우선순위 필터, 정렬
 */
'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  CalendarClock,
  CalendarCheck2,
  ArrowUpDown,
  AlignLeft,
} from 'lucide-react';
import type { Priority } from '@/types/todo';

/** 상태 필터: 전체 | 진행중 | 완료 | 지연 */
export type StatusFilter = 'all' | 'in_progress' | 'completed' | 'overdue';

/** 정렬 기준 */
export type SortOption = 'priority' | 'due_date' | 'created_date' | 'title';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  priorityFilter: Priority | 'all';
  onPriorityFilterChange: (value: Priority | 'all') => void;
  sortOption: SortOption;
  onSortOptionChange: (value: SortOption) => void;
}

export const Toolbar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortOption,
  onSortOptionChange,
}: ToolbarProps) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* 검색 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="제목, 설명으로 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 상태 필터 */}
      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="in_progress">진행중</SelectItem>
          <SelectItem value="completed">완료</SelectItem>
          <SelectItem value="overdue">지연</SelectItem>
        </SelectContent>
      </Select>

      {/* 우선순위 필터 */}
      <Select value={priorityFilter} onValueChange={(v) => onPriorityFilterChange(v as Priority | 'all')}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="우선순위" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="high">높음</SelectItem>
          <SelectItem value="medium">보통</SelectItem>
          <SelectItem value="low">낮음</SelectItem>
        </SelectContent>
      </Select>

      {/* 정렬 */}
      <Select value={sortOption} onValueChange={(v) => onSortOptionChange(v as SortOption)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="정렬" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_date">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              생성일순
            </span>
          </SelectItem>
          <SelectItem value="due_date">
            <span className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
              마감일순
            </span>
          </SelectItem>
          <SelectItem value="priority">
            <span className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              우선순위순
            </span>
          </SelectItem>
          <SelectItem value="title">
            <span className="flex items-center gap-2">
              <AlignLeft className="h-4 w-4 text-muted-foreground" />
              제목순
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
