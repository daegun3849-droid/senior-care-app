/**
 * 할 일 목록 컴포넌트
 */
'use client';

import { Todo } from '@/types/todo';
import { TodoCard } from './TodoCard';
import { Loader2 } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  isLoading?: boolean;
  error?: Error | null;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onAdd?: () => void;
  onAiSummaryUpdate?: (id: string, summary: string) => void;
}

/**
 * 로딩 상태 UI
 */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="mt-4 text-sm text-muted-foreground">할 일 목록을 불러오는 중...</p>
  </div>
);

/**
 * 빈 상태 UI
 */
const EmptyState = ({ onAdd }: { onAdd?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <span className="text-3xl">✅</span>
    </div>
    <h3 className="text-lg font-semibold mb-1">할 일이 없습니다</h3>
    <p className="text-sm text-muted-foreground text-center mb-6">
      새로운 할 일을 추가해보세요!
    </p>
    {onAdd && (
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        + 할일 추가하기
      </button>
    )}
  </div>
);

/**
 * 오류 상태 UI
 */
const ErrorState = ({ error }: { error: Error }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-6xl mb-4">⚠️</div>
    <h3 className="text-lg font-semibold mb-2 text-destructive">할 일 목록을 불러올 수 없습니다</h3>
    <p className="text-sm text-muted-foreground text-center">
      {error.message || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
    </p>
  </div>
);

export const TodoList = ({
  todos,
  isLoading = false,
  error = null,
  onToggleComplete,
  onEdit,
  onDelete,
  onAdd,
  onAiSummaryUpdate,
}: TodoListProps) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!todos.length) {
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onAiSummaryUpdate={onAiSummaryUpdate}
        />
      ))}
    </div>
  );
};
