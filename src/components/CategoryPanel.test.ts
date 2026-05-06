import { describe, it, expect, beforeEach } from 'vitest';
import { renderCategoryPanel } from './CategoryPanel';
import { createMockTodo, createMockCategory } from '../setup/mocks';
import { setLanguage, t } from '../services/i18n';

describe('CategoryPanel', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderCategoryPanel - basic structure', () => {
    it('should render category panel container', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('category-panel');
    });

    it('should render category header', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('category-header');
      expect(html).toContain(t('categories'));
    });

    it('should render manage categories button', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('icon-btn');
      expect(html).toContain(t('manageCategories'));
    });

    it('should render category list', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('category-list');
    });

    it('should render add category button', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('add-category-btn');
      expect(html).toContain(t('newCategory'));
    });
  });

  describe('renderCategoryPanel - all items category', () => {
    it('should render all items category', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain(t('allItems'));
      expect(html).toContain('📋');
    });

    it('should have correct count for all items', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'pending' }),
        createMockTodo({ id: '2', status: 'completed' }),
      ];
      const html = renderCategoryPanel([], todos, null, 'total', () => {}, () => {});
      expect(html).toContain('cat-count');
    });

    it('should count all todos when countMode is total', () => {
      const todos = [
        createMockTodo({ id: '1' }),
        createMockTodo({ id: '2' }),
      ];
      const html = renderCategoryPanel([], todos, null, 'total', () => {}, () => {});
      expect(html).toContain('cat-count">2</span>');
    });

    it('should count uncompleted todos when countMode is uncompleted', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'pending' }),
        createMockTodo({ id: '2', status: 'completed' }),
      ];
      const html = renderCategoryPanel([], todos, null, 'uncompleted', () => {}, () => {});
      expect(html).toContain('cat-count">1</span>');
    });

    it('should count completed todos when countMode is completed', () => {
      const todos = [
        createMockTodo({ id: '1', status: 'pending' }),
        createMockTodo({ id: '2', status: 'completed' }),
      ];
      const html = renderCategoryPanel([], todos, null, 'completed', () => {}, () => {});
      expect(html).toContain('cat-count">1</span>');
    });
  });

  describe('renderCategoryPanel - daily todos category', () => {
    it('should render daily todos category', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain(t('dailyTodos'));
      expect(html).toContain('🔄');
    });

    it('should have daily class on count', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('cat-count daily');
    });

    it('should count only daily todos', () => {
      const todos = [
        createMockTodo({ id: '1', is_daily: true }),
        createMockTodo({ id: '2', is_daily: false }),
      ];
      const html = renderCategoryPanel([], todos, null, 'total', () => {}, () => {});
      expect(html).toContain('cat-count daily">1</span>');
    });

    it('should count uncompleted daily todos when countMode is uncompleted', () => {
      const todos = [
        createMockTodo({ id: '1', is_daily: true, status: 'pending' }),
        createMockTodo({ id: '2', is_daily: true, status: 'completed' }),
      ];
      const html = renderCategoryPanel([], todos, null, 'uncompleted', () => {}, () => {});
      expect(html).toContain('cat-count daily">1</span>');
    });
  });

  describe('renderCategoryPanel - user categories', () => {
    it('should render user categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work' }),
      ];
      const html = renderCategoryPanel(categories, [], null, 'total', () => {}, () => {});
      expect(html).toContain('Work');
    });

    it('should filter out system categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work', is_system: false }),
        createMockCategory({ id: 'system-cat', name: 'SystemCategory', is_system: true }),
      ];
      const html = renderCategoryPanel(categories, [], null, 'total', () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).not.toContain('SystemCategory');
    });

    it('should render category icon and color', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work', icon: '💼', color: '#EF4444' }),
      ];
      const html = renderCategoryPanel(categories, [], null, 'total', () => {}, () => {});
      expect(html).toContain('💼');
      expect(html).toContain('#EF4444');
    });

    it('should escape HTML in category name', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: '<script>alert(1)</script>' }),
      ];
      const html = renderCategoryPanel(categories, [], null, 'total', () => {}, () => {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should have correct category count', () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Work' })];
      const todos = [
        createMockTodo({ id: '1', category_id: 'cat-1' }),
        createMockTodo({ id: '2', category_id: 'cat-1' }),
      ];
      const html = renderCategoryPanel(categories, todos, null, 'total', () => {}, () => {});
      expect(html).toContain('cat-count">2</span>');
    });
  });

  describe('renderCategoryPanel - selection state', () => {
    it('should mark selected category', () => {
      const categories = [createMockCategory({ id: 'cat-1' })];
      const html = renderCategoryPanel(categories, [], 'cat-1', 'total', () => {}, () => {});
      expect(html).toContain('category-item selected');
    });

    it('should mark all items as selected when selectedCategoryId is null', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('category-item selected');
    });

    it('should mark daily as selected when selectedCategoryId is daily', () => {
      const html = renderCategoryPanel([], [], 'daily', 'total', () => {}, () => {});
      expect(html).toContain('category-item daily selected');
    });
  });

  describe('renderCategoryPanel - event handlers', () => {
    it('should have select category handler', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('window.todoApp.selectCategory');
    });

    it('should have open category manager handler', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('window.todoApp.openCategoryManager()');
    });

    it('should have add category handler', () => {
      const html = renderCategoryPanel([], [], null, 'total', () => {}, () => {});
      expect(html).toContain('window.todoApp.addCategory()');
    });

    it('should have context menu handler for user categories', () => {
      const categories = [createMockCategory({ id: 'cat-1' })];
      const html = renderCategoryPanel(categories, [], null, 'total', () => {}, () => {});
      expect(html).toContain('window.todoApp.showCategoryContextMenu');
    });
  });
});
