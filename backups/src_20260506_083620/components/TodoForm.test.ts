import { describe, it, expect, beforeEach } from 'vitest';
import { renderTodoForm } from './TodoForm';
import { createMockTodo, createMockCategory } from '../setup/mocks';
import { setLanguage, t } from '../services/i18n';

describe('TodoForm', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderTodoForm - new todo mode', () => {
    it('should render modal for new todo', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('modal-overlay');
      expect(html).toContain('modal');
    });

    it('should render new todo title', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('➕');
      expect(html).toContain(t('newTodo'));
    });

    it('should not render delete button for new todo', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).not.toContain('btn-danger');
    });

    it('should have empty form fields', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('value=""');
    });

    it('should have required name field', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain(t('nameRequired'));
    });
  });

  describe('renderTodoForm - edit todo mode', () => {
    it('should render edit todo title', () => {
      const todo = createMockTodo({ name: 'Existing Todo' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('✏️');
      expect(html).toContain(t('editTodo'));
    });

    it('should render delete button in edit mode', () => {
      const todo = createMockTodo();
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('btn-danger');
      expect(html).toContain(t('delete'));
    });

    it('should pre-fill todo name', () => {
      const todo = createMockTodo({ name: 'My Todo' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('My Todo');
    });

    it('should pre-fill todo notes', () => {
      const todo = createMockTodo({ notes: 'Some notes here' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('Some notes here');
    });

    it('should pre-select correct priority', () => {
      const todo = createMockTodo({ priority: 'high' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('value="high" selected');
    });

    it('should pre-select correct status', () => {
      const todo = createMockTodo({ status: 'in_progress' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('value="in_progress" selected');
    });

    it('should check daily checkbox when is_daily is true', () => {
      const todo = createMockTodo({ is_daily: true });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('checked');
      expect(html).toContain('todo-is-daily');
    });

    it('should pre-fill quick launch', () => {
      const todo = createMockTodo({ quick_launch: 'https://example.com' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('https://example.com');
    });
  });

  describe('renderTodoForm - categories', () => {
    it('should render category dropdown', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('todo-category');
      expect(html).toContain(t('noCategory'));
    });

    it('should render non-system categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work', is_system: false }),
        createMockCategory({ id: 'cat-2', name: 'Personal', is_system: false }),
      ];
      const html = renderTodoForm(null, categories, () => {}, () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).toContain('Personal');
    });

    it('should filter out system categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work', is_system: false }),
        createMockCategory({ id: 'system-cat', name: 'SystemCategory', is_system: true }),
      ];
      const html = renderTodoForm(null, categories, () => {}, () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).not.toContain('SystemCategory');
    });

    it('should pre-select correct category', () => {
      const todo = createMockTodo({ category_id: 'cat-1' });
      const categories = [createMockCategory({ id: 'cat-1', name: 'Work' })];
      const html = renderTodoForm(todo, categories, () => {}, () => {}, () => {});
      expect(html).toContain('value="cat-1" selected');
    });
  });

  describe('renderTodoForm - due date', () => {
    it('should render datetime-local input', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('type="datetime-local"');
      expect(html).toContain('todo-due-date');
    });

    it('should format due date for input', () => {
      const todo = createMockTodo({ due_date: '2026-04-20T10:30:00Z' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('2026-04-20T10:30');
    });
  });

  describe('renderTodoForm - HTML escaping', () => {
    it('should escape HTML in todo name', () => {
      const todo = createMockTodo({ name: '<script>alert("xss")</script>' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in notes', () => {
      const todo = createMockTodo({ notes: '<b>bold</b>' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;');
    });

    it('should escape HTML in quick launch', () => {
      const todo = createMockTodo({ quick_launch: '<script>alert(1)</script>' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('renderTodoForm - reminders', () => {
    it('should render reminder checkboxes', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('reminder-check');
      expect(html).toContain('60');
      expect(html).toContain('30');
      expect(html).toContain('15');
      expect(html).toContain(t('atDueTime'));
    });

    it('should check enabled reminders', () => {
      const todo = createMockTodo({ reminders: '[{"id":"1","offsetMinutes":-30,"triggered":false}]' });
      const html = renderTodoForm(todo, [], () => {}, () => {}, () => {});
      expect(html).toContain('data-minutes="30"');
      expect(html).toContain('checked');
    });
  });

  describe('renderTodoForm - buttons', () => {
    it('should have save button', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('btn-primary');
      expect(html).toContain(t('save'));
    });

    it('should have cancel button', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('btn-secondary');
      expect(html).toContain(t('cancel'));
    });

    it('should have close button', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('close-btn');
    });
  });

  describe('renderTodoForm - priority options', () => {
    it('should render all priority options', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('value="low"');
      expect(html).toContain('value="medium"');
      expect(html).toContain('value="high"');
      expect(html).toContain('value="urgent"');
    });
  });

  describe('renderTodoForm - status options', () => {
    it('should render all status options', () => {
      const html = renderTodoForm(null, [], () => {}, () => {}, () => {});
      expect(html).toContain('value="pending"');
      expect(html).toContain('value="in_progress"');
      expect(html).toContain('value="completed"');
      expect(html).toContain('value="blocked"');
    });
  });
});
