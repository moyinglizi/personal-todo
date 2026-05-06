import { invoke } from '@tauri-apps/api/core';
import type { Todo, Category, Settings, Reminder } from '../types';

// Todo operations
export async function getTodos(): Promise<Todo[]> {
  return await invoke('get_todos');
}

export async function createTodo(
  name: string,
  dueDate: string | null,
  dueDateDisplay: string | null,
  categoryId: string | null,
  priority: string,
  isDaily: boolean,
  status: string = 'pending',
  dailyTime: string | null = null
): Promise<Todo> {
  return await invoke('create_todo', {
    name,
    dueDate,
    dueDateDisplay,
    categoryId,
    priority,
    isDaily,
    status,
    dailyTime,
  });
}

export async function updateTodo(
  id: string,
  name: string,
  dueDate: string | null,
  dueDateDisplay: string | null,
  status: string,
  notes: string,
  quickLaunch: string | null,
  reminders: string,
  categoryId: string | null,
  priority: string,
  isDaily: boolean,
  dailyTime: string | null = null
): Promise<void> {
  return await invoke('update_todo', {
    id,
    name,
    dueDate,
    dueDateDisplay,
    status,
    notes,
    quickLaunch,
    reminders,
    categoryId,
    priority,
    isDaily,
    dailyTime,
  });
}

export async function deleteTodo(id: string): Promise<void> {
  return await invoke('delete_todo', { id });
}

// Category operations
export async function getCategories(): Promise<Category[]> {
  return await invoke('get_categories');
}

export async function createCategory(
  name: string,
  color: string,
  icon: string
): Promise<Category> {
  return await invoke('create_category', { name, color, icon });
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  icon: string
): Promise<void> {
  return await invoke('update_category', { id, name, color, icon });
}

export async function deleteCategory(id: string): Promise<void> {
  return await invoke('delete_category', { id });
}

export async function reorderCategories(sourceId: string, targetId: string): Promise<void> {
  return await invoke('reorder_categories', { sourceId, targetId });
}

// Settings operations
export async function getSettings(): Promise<Settings> {
  return await invoke('get_settings');
}

export async function updateSettings(
  hotkey: string,
  theme: string,
  language: string,
  autoStart: boolean,
  categoryCountMode: string
): Promise<void> {
  return await invoke('update_settings', { hotkey, theme, language, autoStart, categoryCountMode });
}

// Auto start operations
export async function setAutoStart(enabled: boolean): Promise<void> {
  return await invoke('set_auto_start', { enabled });
}

export async function getAutoStart(): Promise<boolean> {
  return await invoke('get_auto_start');
}

// Daily reset
export async function resetDailyTodos(): Promise<void> {
  return await invoke('reset_daily_todos');
}

// Open path (auto-detect type: URL, folder, or executable)
export async function openPath(path: string): Promise<void> {
  return await invoke('launch_url', { path });
}

export function parseReminders(json: string): Reminder[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function stringifyReminders(items: Reminder[]): string {
  return JSON.stringify(items);
}
