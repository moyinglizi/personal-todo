export interface Todo {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  due_date_display: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  notes: string;
  quick_launch: string | null;
  reminders: string;
  tags: string;
  recurring: string | null;
  position: number;
  category_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_daily: boolean;
  last_daily_reset: string | null;
  daily_time: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_system: boolean;
  order: number;
  created_at: string;
}

export interface Reminder {
  id: string;
  offsetMinutes: number;
  triggered: boolean;
}

export interface Settings {
  hotkey: string;
  theme: 'light' | 'dark';
  language: 'en' | 'zh';
  auto_start: boolean;
  category_count_mode: 'total' | 'uncompleted' | 'completed';
}

export type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'blocked';
export type SortBy = 'position' | 'due_date' | 'priority' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface AppState {
  todos: Todo[];
  categories: Category[];
  settings: Settings;
  filterStatus: FilterStatus;
  filterCategory: string | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;
  selectedTodoId: string | null;
  editingTodo: Todo | null;
  isQuickAddOpen: boolean;
  isSettingsOpen: boolean;
  isCategoryManagerOpen: boolean;
  isConfirmOpen: boolean;
  confirmType: 'todo' | 'category' | null;
  confirmTargetId: string | null;
  draggingTodoId: string | null;
  draggingCategoryId: string | null;
  todoListScrollTop: number;
}
