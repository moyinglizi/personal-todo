import { describe, it, expect, beforeEach } from 'vitest';
import { renderQuickInput } from './QuickInput';
import { createMockCategory } from '../setup/mocks';
import { setLanguage, t } from '../services/i18n';

describe('QuickInput', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderQuickInput', () => {
    it('should render modal overlay', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('modal-overlay');
    });

    it('should render quick add modal', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('quick-add-modal');
    });

    it('should render header with title', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain(t('quickAdd'));
      expect(html).toContain('➕');
    });

    it('should render close button', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('close-btn');
    });

    it('should render name input', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('quick-name');
      expect(html).toContain(t('nameRequired'));
    });

    it('should render category dropdown', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('quick-category');
    });

    it('should render status dropdown', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('quick-status');
      expect(html).toContain('pending');
      expect(html).toContain('in_progress');
      expect(html).toContain('completed');
      expect(html).toContain('blocked');
    });

    it('should render priority dropdown', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('quick-priority');
      expect(html).toContain('low');
      expect(html).toContain('medium');
      expect(html).toContain('high');
      expect(html).toContain('urgent');
    });

    it('should render due date input as datetime-local', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('type="datetime-local"');
      expect(html).toContain('quick-due');
    });

    it('should render more options toggle', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('quick-add-more-toggle');
      expect(html).toContain(t('moreOptions'));
    });

    it('should hide more options by default', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('style="display: none;"');
    });

    it('should render footer with cancel and add buttons', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('btn-secondary');
      expect(html).toContain('btn-primary');
    });

    it('should render all category options', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work' }),
        createMockCategory({ id: 'cat-2', name: 'Personal' }),
      ];
      const html = renderQuickInput(categories, null, () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).toContain('Personal');
    });

    it('should filter out system categories', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work', is_system: false }),
        createMockCategory({ id: 'system-cat', name: 'SystemCategory', is_system: true }),
      ];
      const html = renderQuickInput(categories, null, () => {}, () => {});
      expect(html).toContain('Work');
      expect(html).not.toContain('SystemCategory');
    });

    it('should pre-select correct category', () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Work' })];
      const html = renderQuickInput(categories, 'cat-1', () => {}, () => {});
      expect(html).toContain('value="cat-1" selected');
    });

    it('should have close handler', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('window.todoApp.closeQuickAdd()');
    });

    it('should have quick add handler', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('window.todoApp.quickAdd()');
    });

    it('should have toggle more options handler', () => {
      const html = renderQuickInput([], null, () => {}, () => {});
      expect(html).toContain('window.todoApp.toggleQuickAddMore()');
    });
  });
});
