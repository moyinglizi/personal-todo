import { invoke } from '@tauri-apps/api/core';
import type { Todo } from '../types';

export function checkDailyReset(todos: Todo[]): Todo[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return todos.map(todo => {
    if (!todo.is_daily || todo.status === 'completed') {
      return todo;
    }

    if (todo.last_daily_reset) {
      const lastReset = new Date(todo.last_daily_reset);
      lastReset.setHours(0, 0, 0, 0);

      if (lastReset.getTime() === today.getTime()) {
        return todo;
      }
    }

    return { ...todo, status: 'pending' as const };
  });
}

export async function resetDailyTodos(): Promise<void> {
  await invoke('reset_daily_todos');
}

export function isDailyTodoCompletedToday(todo: Todo): boolean {
  if (!todo.is_daily || !todo.last_daily_reset) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastReset = new Date(todo.last_daily_reset);
  lastReset.setHours(0, 0, 0, 0);

  return lastReset.getTime() === today.getTime() && todo.status === 'completed';
}
