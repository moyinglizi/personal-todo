import { describe, it, expect, beforeEach } from 'vitest';
import { renderTodoItem } from './TodoItem';
import { createMockTodo } from '../setup/mocks';
import { setLanguage, t } from '../services/i18n';

describe('TodoItem', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderTodoItem', () => {
    it('should render todo name', () => {
      const todo = createMockTodo({ name: 'Test Todo Item' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('Test Todo Item');
    });

    it('should render with selected class when selected', () => {
      const todo = createMockTodo({ id: 'todo-1' });
      const html = renderTodoItem(todo, true, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('selected');
    });

    it('should not contain selected class when not selected', () => {
      const todo = createMockTodo({ id: 'todo-1' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).not.toContain('class="todo-item selected');
    });

    it('should render with completed class when status is completed', () => {
      const todo = createMockTodo({ status: 'completed' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('completed');
    });

    it('should render priority indicator with urgent color', () => {
      const todo = createMockTodo({ priority: 'urgent' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('#EF4444');
    });

    it('should render priority indicator with high color', () => {
      const todo = createMockTodo({ priority: 'high' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('#F97316');
    });

    it('should render priority indicator with medium color', () => {
      const todo = createMockTodo({ priority: 'medium' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('#EAB308');
    });

    it('should render priority indicator with low color', () => {
      const todo = createMockTodo({ priority: 'low' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('#22C55E');
    });

    it('should render daily badge for daily todos', () => {
      const todo = createMockTodo({ is_daily: true });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('daily-badge');
      expect(html).toContain('🔄 Daily');
    });

    it('should not render daily badge for non-daily todos', () => {
      const todo = createMockTodo({ is_daily: false });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).not.toContain('daily-badge');
    });

    it('should render quick launch button when quick_launch is set', () => {
      const todo = createMockTodo({ quick_launch: 'https://example.com' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('quick-launch-btn');
    });

    it('should escape HTML in todo name', () => {
      const todo = createMockTodo({ name: '<script>alert("xss")</script>' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in special characters', () => {
      const todo = createMockTodo({ name: 'Test & <script>alert(1)</script>' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should render pending status icon', () => {
      const todo = createMockTodo({ status: 'pending' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('○');
    });

    it('should render in_progress status icon', () => {
      const todo = createMockTodo({ status: 'in_progress' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('◐');
    });

    it('should render completed status icon', () => {
      const todo = createMockTodo({ status: 'completed' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('●');
    });

    it('should render blocked status icon', () => {
      const todo = createMockTodo({ status: 'blocked' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('⊘');
    });

    it('should render todo menu button', () => {
      const todo = createMockTodo();
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('todo-menu-btn');
    });

    it('should have correct data-id attribute', () => {
      const todo = createMockTodo({ id: 'test-id-123' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('data-id="test-id-123"');
    });

    it('should have drag handle', () => {
      const todo = createMockTodo({ id: 'test-id' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('todo-drag-handle');
      expect(html).toContain('⋮⋮');
    });

    it('should have onclick handlers', () => {
      const todo = createMockTodo({ id: 'test-id' });
      const html = renderTodoItem(todo, false, () => {}, () => {}, () => {}, () => {});
      expect(html).toContain('window.todoApp.selectTodo');
      expect(html).toContain('window.todoApp.editTodo');
      expect(html).toContain('window.todoApp.toggleStatus');
      expect(html).toContain('window.todoApp.showContextMenu');
    });
  });
});
