import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockTodo, createMockCategory, createMockSettings } from '../setup/mocks';

// Mock the storage module
vi.mock('../services/storage', () => ({
  getTodos: vi.fn().mockResolvedValue([]),
  createTodo: vi.fn().mockResolvedValue({}),
  updateTodo: vi.fn().mockResolvedValue(undefined),
  deleteTodo: vi.fn().mockResolvedValue(undefined),
  getCategories: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue(createMockSettings()),
  updateSettings: vi.fn().mockResolvedValue(undefined),
  resetDailyTodos: vi.fn().mockResolvedValue(undefined),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  reorderCategories: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(undefined),
  stringifyReminders: vi.fn().mockReturnValue('[]'),
  setAutoStart: vi.fn().mockResolvedValue(undefined),
}));

// Mock reminder module
vi.mock('../services/reminder', () => ({
  reminderScheduler: {
    init: vi.fn().mockResolvedValue(true),
    schedule: vi.fn(),
    cancel: vi.fn(),
    cancelAll: vi.fn(),
  },
}));

// Mock dailyReset module
vi.mock('../services/dailyReset', () => ({
  checkDailyReset: vi.fn().mockImplementation((todos) => todos),
}));

// Mock i18n
vi.mock('../services/i18n', () => ({
  t: vi.fn((key) => key),
  setLanguage: vi.fn(),
  getTranslations: vi.fn().mockReturnValue({}),
}));

// Create a simple test helper to verify filtering logic without DOM
describe('TodoApp Business Logic', () => {
  describe('Filtering Logic', () => {
    // Helper function that mimics getFilteredTodos logic
    function getFilteredTodos(
      todos: ReturnType<typeof createMockTodo>[],
      filterStatus: string,
      filterCategory: string | null,
      searchQuery: string,
      sortBy: string,
      sortOrder: string
    ) {
      let filtered = [...todos];

      // Filter by status
      if (filterStatus !== 'all') {
        filtered = filtered.filter(t => t.status === filterStatus);
      }

      // Filter by category
      if (filterCategory !== null) {
        if (filterCategory === 'daily') {
          filtered = filtered.filter(t => t.is_daily);
        } else {
          filtered = filtered.filter(t => t.category_id === filterCategory);
        }
      }

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(query) ||
          t.notes.toLowerCase().includes(query)
        );
      }

      // Sort
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => {
        if (filterStatus === 'all') {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
        }

        let cmp = 0;
        switch (sortBy) {
          case 'due_date':
            if (!a.due_date && !b.due_date) cmp = 0;
            else if (!a.due_date) cmp = 1;
            else if (!b.due_date) cmp = -1;
            else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case 'priority':
            cmp = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            break;
          case 'created_at':
            cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            break;
          default:
            cmp = a.position - b.position;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });

      return filtered;
    }

    it('should return all todos when filter is all', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'pending' }),
        createMockTodo({ id: '2', status: 'completed' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'position', 'asc');
      expect(result).toHaveLength(2);
    });

    it('should filter by pending status', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'pending' }),
        createMockTodo({ id: '2', status: 'completed' }),
        createMockTodo({ id: '3', status: 'pending' }),
      ];
      const result = getFilteredTodos(todos, 'pending', null, '', 'position', 'asc');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.status === 'pending')).toBe(true);
    });

    it('should filter by completed status', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'pending' }),
        createMockTodo({ id: '2', status: 'completed' }),
      ];
      const result = getFilteredTodos(todos, 'completed', null, '', 'position', 'asc');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('should filter by category', () => {
      const todos = [
        createMockTodo({ id: '1', category_id: 'cat-1' }),
        createMockTodo({ id: '2', category_id: 'cat-2' }),
        createMockTodo({ id: '3', category_id: 'cat-1' }),
      ];
      const result = getFilteredTodos(todos, 'all', 'cat-1', '', 'position', 'asc');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.category_id === 'cat-1')).toBe(true);
    });

    it('should filter by daily category', () => {
      const todos = [
        createMockTodo({ id: '1', is_daily: true }),
        createMockTodo({ id: '2', is_daily: false }),
        createMockTodo({ id: '3', is_daily: true }),
      ];
      const result = getFilteredTodos(todos, 'all', 'daily', '', 'position', 'asc');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.is_daily)).toBe(true);
    });

    it('should filter by search query in name', () => {
      const todos = [
        createMockTodo({ id: '1', name: 'Buy groceries' }),
        createMockTodo({ id: '2', name: 'Walk the dog' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, 'buy', 'position', 'asc');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Buy groceries');
    });

    it('should filter by search query in notes', () => {
      const todos = [
        createMockTodo({ id: '1', name: 'Task 1', notes: 'Meeting notes' }),
        createMockTodo({ id: '2', name: 'Task 2', notes: 'Shopping list' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, 'meeting', 'position', 'asc');
      expect(result).toHaveLength(1);
      expect(result[0].notes).toBe('Meeting notes');
    });

    it('should search case-insensitively', () => {
      const todos = [
        createMockTodo({ id: '1', name: 'BUY Groceries' }),
        createMockTodo({ id: '2', name: 'walk the dog' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, 'buy', 'position', 'asc');
      expect(result).toHaveLength(1);
    });
  });

  describe('Sorting Logic', () => {
    function getFilteredTodos(
      todos: ReturnType<typeof createMockTodo>[],
      filterStatus: string,
      filterCategory: string | null,
      searchQuery: string,
      sortBy: string,
      sortOrder: string
    ) {
      let filtered = [...todos];

      if (filterStatus !== 'all') {
        filtered = filtered.filter(t => t.status === filterStatus);
      }

      if (filterCategory !== null) {
        if (filterCategory === 'daily') {
          filtered = filtered.filter(t => t.is_daily);
        } else {
          filtered = filtered.filter(t => t.category_id === filterCategory);
        }
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(query) ||
          t.notes.toLowerCase().includes(query)
        );
      }

      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => {
        if (filterStatus === 'all') {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
        }

        let cmp = 0;
        switch (sortBy) {
          case 'due_date':
            if (!a.due_date && !b.due_date) cmp = 0;
            else if (!a.due_date) cmp = 1;
            else if (!b.due_date) cmp = -1;
            else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case 'priority':
            cmp = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            break;
          case 'created_at':
            cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            break;
          default:
            cmp = a.position - b.position;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });

      return filtered;
    }

    it('should sort completed todos to the bottom when filter is all', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'completed' }),
        createMockTodo({ id: '2', status: 'pending' }),
        createMockTodo({ id: '3', status: 'in_progress' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'position', 'asc');
      expect(result[result.length - 1].status).toBe('completed');
    });

    it('should sort by due_date ascending', () => {
      const todos = [
        createMockTodo({ id: '1', due_date: '2026-04-25T00:00:00Z' }),
        createMockTodo({ id: '2', due_date: '2026-04-20T00:00:00Z' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'due_date', 'asc');
      expect(result[0].id).toBe('2'); // Earlier date first
    });

    it('should sort by due_date descending', () => {
      const todos = [
        createMockTodo({ id: '1', due_date: '2026-04-20T00:00:00Z' }),
        createMockTodo({ id: '2', due_date: '2026-04-25T00:00:00Z' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'due_date', 'desc');
      expect(result[0].id).toBe('2'); // Later date first
    });

    it('should sort by priority (urgent first)', () => {
      const todos = [
        createMockTodo({ id: '1', priority: 'low' }),
        createMockTodo({ id: '2', priority: 'urgent' }),
        createMockTodo({ id: '3', priority: 'medium' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'priority', 'asc');
      expect(result[0].priority).toBe('urgent');
      expect(result[1].priority).toBe('medium');
      expect(result[2].priority).toBe('low');
    });

    it('should put todos without due_date at the end when sorting by due_date', () => {
      const todos = [
        createMockTodo({ id: '1', due_date: '2026-04-20T00:00:00Z' }),
        createMockTodo({ id: '2', due_date: null }),
        createMockTodo({ id: '3', due_date: '2026-04-25T00:00:00Z' }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'due_date', 'asc');
      expect(result[result.length - 1].id).toBe('2'); // null due_date at end
    });

    it('should sort by position by default', () => {
      const todos = [
        createMockTodo({ id: '1', position: 2 }),
        createMockTodo({ id: '2', position: 0 }),
        createMockTodo({ id: '3', position: 1 }),
      ];
      const result = getFilteredTodos(todos, 'all', null, '', 'position', 'asc');
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(2);
    });
  });

  describe('Status Transitions', () => {
    it('should cycle through status order', () => {
      const statusOrder = ['pending', 'in_progress', 'completed', 'blocked'];
      const getNextStatus = (current: string) => {
        const currentIndex = statusOrder.indexOf(current);
        return statusOrder[(currentIndex + 1) % statusOrder.length];
      };

      expect(getNextStatus('pending')).toBe('in_progress');
      expect(getNextStatus('in_progress')).toBe('completed');
      expect(getNextStatus('completed')).toBe('blocked');
      expect(getNextStatus('blocked')).toBe('pending');
    });
  });

  describe('Priority Order', () => {
    it('should have correct priority order', () => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

      expect(priorityOrder['urgent']).toBeLessThan(priorityOrder['high']);
      expect(priorityOrder['high']).toBeLessThan(priorityOrder['medium']);
      expect(priorityOrder['medium']).toBeLessThan(priorityOrder['low']);
    });
  });

  describe('Category Filtering', () => {
    function filterByCategory(todos: ReturnType<typeof createMockTodo>[], categoryId: string | null) {
      if (categoryId === null) {
        return todos;
      }
      if (categoryId === 'daily') {
        return todos.filter(t => t.is_daily);
      }
      return todos.filter(t => t.category_id === categoryId);
    }

    it('should return all todos for null category', () => {
      const todos = [
        createMockTodo({ id: '1', category_id: 'cat-1' }),
        createMockTodo({ id: '2', category_id: 'cat-2' }),
      ];
      const result = filterByCategory(todos, null);
      expect(result).toHaveLength(2);
    });

    it('should filter by specific category', () => {
      const todos = [
        createMockTodo({ id: '1', category_id: 'cat-1' }),
        createMockTodo({ id: '2', category_id: 'cat-2' }),
      ];
      const result = filterByCategory(todos, 'cat-1');
      expect(result).toHaveLength(1);
      expect(result[0].category_id).toBe('cat-1');
    });

    it('should filter daily todos for daily category', () => {
      const todos = [
        createMockTodo({ id: '1', is_daily: true }),
        createMockTodo({ id: '2', is_daily: false }),
      ];
      const result = filterByCategory(todos, 'daily');
      expect(result).toHaveLength(1);
      expect(result[0].is_daily).toBe(true);
    });
  });

  describe('Search Filtering', () => {
    function searchTodos(todos: ReturnType<typeof createMockTodo>[], query: string) {
      if (!query) {
        return todos;
      }
      const lowerQuery = query.toLowerCase();
      return todos.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.notes.toLowerCase().includes(lowerQuery)
      );
    }

    it('should return all todos for empty search', () => {
      const todos = [createMockTodo({ id: '1', name: 'Test' })];
      const result = searchTodos(todos, '');
      expect(result).toHaveLength(1);
    });

    it('should search in name', () => {
      const todos = [
        createMockTodo({ id: '1', name: 'Buy groceries' }),
        createMockTodo({ id: '2', name: 'Walk dog' }),
      ];
      const result = searchTodos(todos, 'buy');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Buy groceries');
    });

    it('should search in notes', () => {
      const todos = [
        createMockTodo({ id: '1', name: 'Task 1', notes: 'Important meeting' }),
        createMockTodo({ id: '2', name: 'Task 2', notes: 'Shopping list' }),
      ];
      const result = searchTodos(todos, 'meeting');
      expect(result).toHaveLength(1);
      expect(result[0].notes).toBe('Important meeting');
    });

    it('should be case insensitive', () => {
      const todos = [createMockTodo({ id: '1', name: 'BUY Groceries' })];
      const result = searchTodos(todos, 'buy');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no match', () => {
      const todos = [createMockTodo({ id: '1', name: 'Buy groceries' })];
      const result = searchTodos(todos, 'xyz');
      expect(result).toHaveLength(0);
    });
  });
});
