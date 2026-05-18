import type { FilterStatus, SortBy, SortOrder } from '../types';
import { t } from '../services/i18n';

const STATUS_FILTERS: Array<{ value: FilterStatus; labelKey: string }> = [
  { value: 'all', labelKey: 'allTodos' },
  { value: 'pending', labelKey: 'pending' },
  { value: 'in_progress', labelKey: 'inProgress' },
  { value: 'completed', labelKey: 'completed' },
  { value: 'blocked', labelKey: 'blocked' },
];

const SORT_OPTIONS: Array<{ value: SortBy; labelKey: string }> = [
  { value: 'position', labelKey: 'position' },
  { value: 'due_date', labelKey: 'dueDate' },
  { value: 'priority', labelKey: 'priority' },
  { value: 'created_at', labelKey: 'createdAt' },
];

export function renderFilterBar(
  filterStatus: FilterStatus,
  sortBy: SortBy,
  sortOrder: SortOrder,
  onFilterChange: (status: FilterStatus) => void,
  onSortChange: (sort: SortBy) => void,
  onToggleSortOrder: () => void
): string {
  return `
    <div class="filter-bar">
      <div class="filter-tabs">
        ${STATUS_FILTERS.map(filter => `
          <button
            class="filter-tab ${filterStatus === filter.value ? 'active' : ''}"
            onclick="window.todoApp.setFilter('${filter.value}')"
          >
            ${t(filter.labelKey as any)}
          </button>
        `).join('')}
      </div>
      <div class="sort-control">
        <label>${t('sortBy')}:</label>
        <select id="sort-select" onchange="window.todoApp.setSort(this.value)">
          ${SORT_OPTIONS.map(opt => `
            <option value="${opt.value}" ${sortBy === opt.value ? 'selected' : ''}>
              ${t(opt.labelKey as any)}
            </option>
          `).join('')}
        </select>
        <button class="sort-order-btn" onclick="window.todoApp.toggleSortOrder()" title="${sortOrder === 'asc' ? t('sortAsc') : t('sortDesc')}">
          ${sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  `;
}
