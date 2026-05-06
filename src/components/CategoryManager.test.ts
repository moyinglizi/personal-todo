import { describe, it, expect, beforeEach } from 'vitest';
import { renderCategoryManager, renderSettingsModal } from './CategoryManager';
import { createMockCategory } from '../setup/mocks';
import { setLanguage, t } from '../services/i18n';

describe('CategoryManager', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderCategoryManager - basic structure', () => {
    it('should render modal overlay', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('modal-overlay');
    });

    it('should render category manager modal', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('category-manager-modal');
    });

    it('should render header', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain(t('manageCategories'));
    });

    it('should render close button', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('close-btn');
    });

    it('should have close handler on overlay', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('window.todoApp.closeCategoryManager()');
    });
  });

  describe('renderCategoryManager - new category mode', () => {
    it('should render new category form', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain(t('newCategory'));
    });

    it('should have empty name input', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('value=""');
    });

    it('should have create button', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain(t('create'));
    });
  });

  describe('renderCategoryManager - edit category mode', () => {
    it('should render edit category form', () => {
      const category = createMockCategory({ id: 'cat-1', name: 'Work' });
      const html = renderCategoryManager([], category, '#3B82F6', '📁', 'Work', () => {}, () => {});
      expect(html).toContain(t('editCategory'));
    });

    it('should pre-fill category name', () => {
      const category = createMockCategory({ id: 'cat-1', name: 'Work' });
      const html = renderCategoryManager([], category, '#3B82F6', '📁', 'Work', () => {}, () => {});
      expect(html).toContain('Work');
    });

    it('should have save button', () => {
      const category = createMockCategory({ id: 'cat-1', name: 'Work' });
      const html = renderCategoryManager([], category, '#3B82F6', '📁', 'Work', () => {}, () => {});
      expect(html).toContain(t('save'));
    });
  });

  describe('renderCategoryManager - color picker', () => {
    it('should render color picker', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('color-picker');
    });

    it('should render preset colors', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('#EF4444');
      expect(html).toContain('#F97316');
      expect(html).toContain('#EAB308');
    });

    it('should mark selected color', () => {
      const html = renderCategoryManager([], null, '#EF4444', '📁', '', () => {}, () => {});
      expect(html).toContain('color-option selected');
    });

    it('should have selectColor handler', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('window.todoApp.selectColor');
    });
  });

  describe('renderCategoryManager - icon picker', () => {
    it('should render icon picker', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('icon-picker');
    });

    it('should render preset icons', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('📁');
      expect(html).toContain('💼');
      expect(html).toContain('🏠');
    });

    it('should mark selected icon', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('icon-option selected');
    });

    it('should have selectIcon handler', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('window.todoApp.selectIcon');
    });
  });

  describe('renderCategoryManager - category list', () => {
    it('should render category list section', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('category-list-section');
      expect(html).toContain(t('yourCategories'));
    });

    it('should render empty state when no categories', () => {
      const html = renderCategoryManager([], null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain(t('noCustomCategories'));
    });

    it('should render user categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work' }),
        createMockCategory({ id: 'cat-2', name: 'Personal' }),
      ];
      const html = renderCategoryManager(categories, null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).toContain('Personal');
    });

    it('should filter out system categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work', is_system: false }),
        createMockCategory({ id: 'daily', name: 'Daily', is_system: true }),
      ];
      const html = renderCategoryManager(categories, null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).not.toContain('Daily');
    });

    it('should escape HTML in category names', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: '<script>alert(1)</script>' }),
      ];
      const html = renderCategoryManager(categories, null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should have edit button for each category', () => {
      const categories = [createMockCategory({ id: 'cat-1' })];
      const html = renderCategoryManager(categories, null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('startEditCategory');
    });

    it('should have delete button for each category', () => {
      const categories = [createMockCategory({ id: 'cat-1' })];
      const html = renderCategoryManager(categories, null, '#3B82F6', '📁', '', () => {}, () => {});
      expect(html).toContain('confirmDeleteCategory');
    });
  });

  describe('renderSettingsModal', () => {
    it('should render settings modal', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'zh', false, 'uncompleted', () => {});
      expect(html).toContain(t('settings'));
    });

    it('should render hotkey input', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'zh', false, 'uncompleted', () => {});
      expect(html).toContain('settings-hotkey');
      expect(html).toContain('Ctrl+Shift+T');
    });

    it('should render theme dropdown', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'dark', 'zh', false, 'uncompleted', () => {});
      expect(html).toContain('settings-theme');
      expect(html).toContain('dark');
    });

    it('should render language dropdown', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'en', false, 'uncompleted', () => {});
      expect(html).toContain('settings-language');
      expect(html).toContain('English');
    });

    it('should render auto start checkbox', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'zh', true, 'uncompleted', () => {});
      expect(html).toContain('settings-auto-start');
      expect(html).toContain('checked');
    });

    it('should render category count mode dropdown', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'zh', false, 'total', () => {});
      expect(html).toContain('settings-category-count-mode');
      expect(html).toContain('total');
    });

    it('should render reset daily todos button', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'zh', false, 'uncompleted', () => {});
      expect(html).toContain(t('resetAllDaily'));
    });

    it('should have save and cancel buttons', () => {
      const html = renderSettingsModal('Ctrl+Shift+T', 'light', 'zh', false, 'uncompleted', () => {});
      expect(html).toContain('btn-primary');
      expect(html).toContain('btn-secondary');
    });
  });
});
