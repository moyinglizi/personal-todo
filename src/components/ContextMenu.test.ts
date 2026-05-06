import { describe, it, expect, beforeEach } from 'vitest';
import { renderContextMenu, renderCategoryContextMenu } from './ContextMenu';
import { createMockTodo, createMockCategory } from '../setup/mocks';
import { setLanguage, t } from '../services/i18n';

describe('ContextMenu', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderContextMenu - basic structure', () => {
    it('should render overlay', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('context-menu-overlay');
    });

    it('should render menu container', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('context-menu');
    });

    it('should have position styles', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('left:');
      expect(html).toContain('top:');
    });

    it('should close on overlay click', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('onclick="window.todoApp.closeContextMenu()"');
    });

    it('should stop propagation on menu click', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('onclick="event.stopPropagation()"');
    });
  });

  describe('renderContextMenu - status actions', () => {
    it('should render all status actions except current status', () => {
      const todo = createMockTodo({ status: 'pending' });
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain(t('startTask'));
      expect(html).toContain(t('completeTask'));
      expect(html).toContain(t('blockTask'));
    });

    it('should not render current status action', () => {
      const todo = createMockTodo({ status: 'pending' });
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).not.toContain('○');
      expect(html).not.toContain(t('markPending'));
    });

    it('should render status icons for non-current statuses', () => {
      const todo = createMockTodo({ status: 'pending' });
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('◐');
      expect(html).toContain('●');
      expect(html).toContain('⊘');
    });

    it('should have setTodoStatus handler', () => {
      const todo = createMockTodo({ id: 'todo-1' });
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('window.todoApp.setTodoStatus');
    });
  });

  describe('renderContextMenu - edit action', () => {
    it('should render edit button', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('edit');
      expect(html).toContain('✏️');
    });

    it('should have editTodo handler', () => {
      const todo = createMockTodo({ id: 'todo-1' });
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('window.todoApp.editTodo');
    });
  });

  describe('renderContextMenu - delete action', () => {
    it('should render delete button with danger class', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('context-menu-item danger');
      expect(html).toContain(t('deleteTodo'));
      expect(html).toContain('🗑️');
    });

    it('should have confirmDelete handler', () => {
      const todo = createMockTodo({ id: 'todo-1' });
      const html = renderContextMenu(100, 100, todo, () => {});
      expect(html).toContain('window.todoApp.confirmDelete');
    });
  });

  describe('renderContextMenu - position adjustment', () => {
    it('should adjust position when too close to right edge', () => {
      const todo = createMockTodo();
      // MENU_WIDTH = 180, so x > window.innerWidth - 190 should be adjusted
      const html = renderContextMenu(1000, 100, todo, () => {});
      expect(html).toContain('left:');
    });

    it('should adjust position when too close to bottom edge', () => {
      const todo = createMockTodo();
      // MENU_HEIGHT = 200, so y > window.innerHeight - 210 should be adjusted
      const html = renderContextMenu(100, 1000, todo, () => {});
      expect(html).toContain('top:');
    });

    it('should ensure minimum position of 10', () => {
      const todo = createMockTodo();
      const html = renderContextMenu(-100, -100, todo, () => {});
      expect(html).toContain('left:');
      expect(html).toContain('top:');
    });
  });

  describe('renderCategoryContextMenu', () => {
    it('should render category context menu', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', 'Work');
      expect(html).toContain('context-menu-overlay');
      expect(html).toContain('context-menu');
    });

    it('should render edit button', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', 'Work');
      expect(html).toContain('✏️');
      expect(html).toContain('cat-1');
    });

    it('should render delete button', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', 'Work');
      expect(html).toContain('context-menu-item danger');
      expect(html).toContain('confirmDeleteCategory');
    });

    it('should escape HTML in category name', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', '<script>alert(1)</script>');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should have close handler', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', 'Work');
      expect(html).toContain('window.todoApp.closeContextMenu()');
    });

    it('should have startEditCategory handler', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', 'Work');
      expect(html).toContain('window.todoApp.startEditCategory');
    });

    it('should have confirmDeleteCategory handler', () => {
      const html = renderCategoryContextMenu(100, 100, 'cat-1', 'Work');
      expect(html).toContain('window.todoApp.confirmDeleteCategory');
    });
  });
});
