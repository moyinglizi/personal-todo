import { describe, it, expect, beforeEach } from 'vitest';
import { renderFilterBar } from './FilterBar';
import type { FilterStatus, SortBy } from '../types';
import { setLanguage, t } from '../services/i18n';

describe('FilterBar', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderFilterBar', () => {
    it('should render filter bar container', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('filter-bar');
    });

    it('should render all filter tabs', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('All Todos');
      expect(html).toContain('Pending');
      expect(html).toContain('In Progress');
      expect(html).toContain('Completed');
      expect(html).toContain('Blocked');
    });

    it('should mark active filter as active', () => {
      const html = renderFilterBar('completed', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('filter-tab active');
    });

    it('should not mark inactive filters as active', () => {
      const html = renderFilterBar('pending', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('filter-tab active');
      expect(html.match(/filter-tab active/g)?.length).toBe(1);
    });

    it('should render sort dropdown', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain(t('sortBy'));
      expect(html).toContain('sort-select');
    });

    it('should render all sort options', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain(t('position'));
      expect(html).toContain(t('dueDate'));
      expect(html).toContain(t('priority'));
      expect(html).toContain(t('createdAt'));
    });

    it('should select correct sort option', () => {
      const html = renderFilterBar('all', 'due_date', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('value="due_date" selected');
    });

    it('should not select other sort options when due_date is selected', () => {
      const html = renderFilterBar('all', 'due_date', 'asc', () => {}, () => {}, () => {});
      expect(html.match(/selected/g)?.length).toBe(1);
    });

    it('should have sortBy label', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain(t('sortBy'));
    });

    it('should have onclick handlers for filter tabs', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('window.todoApp.setFilter');
    });

    it('should have onchange handler for sort select', () => {
      const html = renderFilterBar('all', 'position', 'asc', () => {}, () => {}, () => {});
      expect(html).toContain('window.todoApp.setSort');
    });

    it('should render all status values in filter tabs', () => {
      const statuses: FilterStatus[] = ['all', 'pending', 'in_progress', 'completed', 'blocked'];
      statuses.forEach(status => {
        const html = renderFilterBar(status, 'position', 'asc', () => {}, () => {}, () => {});
        expect(html).toContain(`'${status}')`);
      });
    });

    it('should render all sort values in select', () => {
      const sorts: SortBy[] = ['position', 'due_date', 'priority', 'created_at'];
      sorts.forEach(sort => {
        const html = renderFilterBar('all', sort, 'asc', () => {}, () => {}, () => {});
        expect(html).toContain(`value="${sort}"`);
      });
    });
  });
});
