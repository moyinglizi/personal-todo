import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import * as storage from './storage';
import { createMockTodo, createMockCategory, createMockSettings } from '../setup/mocks';

describe('storage service (invoke wrappers)', () => {
  beforeEach(() => {
    mockIPC((cmd, payload) => {
      if (cmd === "get_todos") return [createMockTodo({ id: "1", name: "Todo 1" })];
      if (cmd === "get_categories") return [createMockCategory({ id: "1", name: "Category 1" })];
      if (cmd === "get_settings") return createMockSettings();
      if (cmd === "create_todo") return createMockTodo({ id: "new-todo-id", name: (payload as any).name || "New Todo" });
      if (cmd === "create_category") {
        const p = payload as any;
        return createMockCategory({ id: "new-cat-id", name: p.name || "New Category", color: p.color || "#3B82F6", icon: p.icon || "📁" });
      }
      if (cmd === "get_auto_start") return false;
      return null;
    });
  });

  afterEach(() => {
    clearMocks();
  });

  describe('getTodos', () => {
    it('should return array of todos', async () => {
      const todos = await storage.getTodos();
      expect(Array.isArray(todos)).toBe(true);
      expect(todos.length).toBeGreaterThan(0);
    });

    it('should return todo with correct structure', async () => {
      const todos = await storage.getTodos();
      const todo = todos[0];
      expect(todo).toHaveProperty('id');
      expect(todo).toHaveProperty('name');
      expect(todo).toHaveProperty('status');
      expect(todo).toHaveProperty('priority');
    });
  });

  describe('createTodo', () => {
    it('should create todo with all parameters', async () => {
      const todo = await storage.createTodo(
        "New Todo",
        "2026-04-20T10:00:00Z",
        "Apr 20, 10:00",
        "cat-1",
        "high",
        false,
        "pending"
      );
      expect(todo.name).toBe("New Todo");
    });

    it('should create todo with null optional fields', async () => {
      const todo = await storage.createTodo(
        "Minimal Todo",
        null,
        null,
        null,
        "low",
        false
      );
      expect(todo.name).toBe("Minimal Todo");
      expect(todo.due_date).toBeNull();
    });
  });

  describe('updateTodo', () => {
    it('should update todo fields', async () => {
      await expect(
        storage.updateTodo(
          "1", "Updated Name", null, null, "completed",
          "notes", null, "[]", null, "high", false
        )
      ).resolves.not.toThrow();
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo without error', async () => {
      await expect(storage.deleteTodo("1")).resolves.not.toThrow();
    });
  });

  describe('getCategories', () => {
    it('should return array of categories', async () => {
      const categories = await storage.getCategories();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('createCategory', () => {
    it('should create category with name, color, icon', async () => {
      const category = await storage.createCategory("Work", "#EF4444", "💼");
      expect(category.name).toBe("Work");
      expect(category.color).toBe("#EF4444");
      expect(category.icon).toBe("💼");
    });
  });

  describe('updateCategory', () => {
    it('should update category without error', async () => {
      await expect(
        storage.updateCategory("1", "Updated", "#000000", "📝")
      ).resolves.not.toThrow();
    });
  });

  describe('deleteCategory', () => {
    it('should delete category without error', async () => {
      await expect(storage.deleteCategory("1")).resolves.not.toThrow();
    });
  });

  describe('reorderCategories', () => {
    it('should reorder categories without error', async () => {
      await expect(
        storage.reorderCategories("cat-1", "cat-2")
      ).resolves.not.toThrow();
    });
  });

  describe('getSettings', () => {
    it('should return settings object', async () => {
      const settings = await storage.getSettings();
      expect(settings).toHaveProperty('hotkey');
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('language');
      expect(settings).toHaveProperty('category_count_mode');
    });
  });

  describe('updateSettings', () => {
    it('should update settings without error', async () => {
      await expect(
        storage.updateSettings("Ctrl+Shift+T", "dark", "en", true, "total")
      ).resolves.not.toThrow();
    });
  });

  describe('setAutoStart', () => {
    it('should set auto start without error', async () => {
      await expect(storage.setAutoStart(true)).resolves.not.toThrow();
    });
  });

  describe('getAutoStart', () => {
    it('should return boolean', async () => {
      const result = await storage.getAutoStart();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('resetDailyTodos', () => {
    it('should reset daily todos without error', async () => {
      await expect(storage.resetDailyTodos()).resolves.not.toThrow();
    });
  });

  describe('openPath', () => {
    it('should open path without error', async () => {
      await expect(storage.openPath("https://example.com")).resolves.not.toThrow();
    });
  });

  describe('parseReminders', () => {
    it('should parse valid JSON reminders', () => {
      const reminders = storage.parseReminders('[{"id":"1","offsetMinutes":30,"triggered":false}]');
      expect(reminders).toHaveLength(1);
      expect(reminders[0].offsetMinutes).toBe(30);
    });

    it('should return empty array for invalid JSON', () => {
      const reminders = storage.parseReminders('not valid json');
      expect(reminders).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const reminders = storage.parseReminders('');
      expect(reminders).toEqual([]);
    });
  });

  describe('stringifyReminders', () => {
    it('should stringify reminders to JSON', () => {
      const json = storage.stringifyReminders([
        { id: "1", offsetMinutes: 30, triggered: false }
      ]);
      expect(json).toBe('[{"id":"1","offsetMinutes":30,"triggered":false}]');
    });

    it('should return empty array string for empty input', () => {
      const json = storage.stringifyReminders([]);
      expect(json).toBe('[]');
    });
  });
});
