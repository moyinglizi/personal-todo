import type { Category, Todo } from '../types';
import { t } from '../services/i18n';

export function renderCategoryPanel(
  categories: Category[],
  todos: Todo[],
  selectedCategoryId: string | null,
  countMode: 'total' | 'uncompleted' | 'completed',
  onSelectCategory: (id: string | null) => void,
  onManageCategories: () => void
): string {
  const getCategoryCount = (categoryId: string | null): number => {
    let filtered = todos;
    if (categoryId !== null && categoryId !== 'daily') {
      filtered = todos.filter(t => t.category_id === categoryId);
    }
    if (countMode === 'uncompleted') {
      return filtered.filter(t => t.status !== 'completed').length;
    } else if (countMode === 'completed') {
      return filtered.filter(t => t.status === 'completed').length;
    }
    return filtered.length;
  };

  const getAllCount = (): number => {
    if (countMode === 'uncompleted') {
      return todos.filter(t => t.status !== 'completed').length;
    } else if (countMode === 'completed') {
      return todos.filter(t => t.status === 'completed').length;
    }
    return todos.length;
  };

  const getDailyCount = (): number => {
    let filtered = todos.filter(t => t.is_daily);
    if (countMode === 'uncompleted') {
      return filtered.filter(t => t.status !== 'completed').length;
    } else if (countMode === 'completed') {
      return filtered.filter(t => t.status === 'completed').length;
    }
    return filtered.length;
  };

  const allCount = getAllCount();
  const dailyCount = getDailyCount();

  return `
    <div class="category-panel">
      <div class="category-header">
        <span>📁 ${t('categories')}</span>
        <button class="icon-btn" onclick="window.todoApp.openCategoryManager()" title="${t('manageCategories')}">⚙️</button>
      </div>
      <div class="category-list">
        <div class="category-item ${selectedCategoryId === null ? 'selected' : ''}"
             data-category-id="all"
             ondragover="window.todoApp.handleCategoryDragOver(event, 'all')"
             ondrop="window.todoApp.handleCategoryDrop(event, 'all')"
             onclick="window.todoApp.selectCategory(null)">
          <span class="cat-icon">📋</span>
          <span class="cat-name">${t('allItems')}</span>
          <span class="cat-count">${allCount}</span>
        </div>

        <div class="category-item daily ${selectedCategoryId === 'daily' ? 'selected' : ''}"
             data-category-id="daily"
             ondragover="window.todoApp.handleCategoryDragOver(event, 'daily')"
             ondrop="window.todoApp.handleCategoryDrop(event, 'daily')"
             onclick="window.todoApp.selectCategory('daily')">
          <span class="cat-icon">🔄</span>
          <span class="cat-name">${t('dailyTodos')}</span>
          <span class="cat-count daily">${dailyCount}</span>
        </div>

        ${categories.filter(c => !c.is_system).map(cat => `
          <div class="category-item ${selectedCategoryId === cat.id ? 'selected' : ''}"
               data-category-id="${cat.id}"
               onclick="window.todoApp.selectCategory('${cat.id}')"
               oncontextmenu="event.preventDefault(); window.todoApp.showCategoryContextMenu(event, '${cat.id}')"
               style="--cat-color: ${cat.color}">
            <span class="cat-icon" style="color: ${cat.color}">${cat.icon}</span>
            <span class="cat-name">${escapeHtml(cat.name)}</span>
            <span class="cat-count">${getCategoryCount(cat.id)}</span>
          </div>
        `).join('')}
      </div>
      <button class="add-category-btn" onclick="window.todoApp.addCategory()">
        + ${t('newCategory')}
      </button>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
