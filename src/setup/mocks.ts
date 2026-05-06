import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import type { Todo, Category, Settings } from "../types";

export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: "todo-1",
  name: "Test Todo",
  created_at: "2026-04-17T10:00:00Z",
  updated_at: "2026-04-17T10:00:00Z",
  due_date: null,
  due_date_display: null,
  status: "pending",
  notes: "",
  quick_launch: "[]",
  reminders: "[]",
  tags: "",
  recurring: null,
  position: 0,
  category_id: null,
  priority: "medium",
  is_daily: false,
  last_daily_reset: null,
  daily_time: null,
  ...overrides,
});

export const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-1",
  name: "Work",
  color: "#3B82F6",
  icon: "💼",
  is_system: false,
  order: 0,
  created_at: "2026-04-17T10:00:00Z",
  ...overrides,
});

export const createMockSettings = (overrides: Partial<Settings> = {}): Settings => ({
  hotkey: "Ctrl+Shift+T",
  theme: "light",
  language: "zh",
  auto_start: false,
  category_count_mode: "uncompleted",
  ...overrides,
});

interface StorageMocksOptions {
  todos?: Todo[];
  categories?: Category[];
  settings?: Settings;
}

export function setupStorageMocks(options: StorageMocksOptions = {}) {
  const {
    todos = [createMockTodo()],
    categories = [createMockCategory()],
    settings = createMockSettings(),
  } = options;

  mockIPC((cmd, _payload) => {
    switch (cmd) {
      case "get_todos":
        return todos;
      case "create_todo":
        return createMockTodo({ id: "new-todo-id", name: "New Todo" });
      case "update_todo":
        return;
      case "delete_todo":
        return;
      case "get_categories":
        return categories;
      case "create_category":
        return createMockCategory({ id: "new-cat-id", name: "New Category" });
      case "update_category":
        return;
      case "delete_category":
        return;
      case "reorder_categories":
        return;
      case "get_settings":
        return settings;
      case "update_settings":
        return;
      case "set_auto_start":
        return;
      case "get_auto_start":
        return false;
      case "reset_daily_todos":
        return;
      case "launch_url":
        return;
      default:
        console.warn(`Unhandled mockIPC command: ${cmd}`);
        return null;
    }
  });
}

export function cleanupMocks() {
  clearMocks();
}
