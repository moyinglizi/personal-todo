import type { Todo } from '../types';
import { t } from '../services/i18n';

const MENU_WIDTH = 180;
const MENU_HEIGHT = 200;

function adjustPosition(x: number, y: number): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (x + MENU_WIDTH > vw - 10) {
    x = vw - MENU_WIDTH - 10;
  }
  if (y + MENU_HEIGHT > vh - 10) {
    y = vh - MENU_HEIGHT - 10;
  }
  if (x < 10) x = 10;
  if (y < 10) y = 10;

  return { x, y };
}

export function renderContextMenu(
  x: number,
  y: number,
  todo: Todo,
  onClose: () => void
): string {
  const pos = adjustPosition(x, y);
  const statusActions = [
    { status: 'pending', labelKey: 'markPending', icon: '○' },
    { status: 'in_progress', labelKey: 'startTask', icon: '◐' },
    { status: 'completed', labelKey: 'completeTask', icon: '●' },
    { status: 'blocked', labelKey: 'blockTask', icon: '⊘' },
  ].filter(action => action.status !== todo.status);

  return `
    <div class="context-menu-overlay" onclick="window.todoApp.closeContextMenu()">
      <div class="context-menu" style="left: ${pos.x}px; top: ${pos.y}px" onclick="event.stopPropagation()">
        ${statusActions.map(action => `
          <button class="context-menu-item" onclick="window.todoApp.setTodoStatus('${todo.id}', '${action.status}')">
            <span class="menu-icon">${action.icon}</span>
            ${t(action.labelKey as any)}
          </button>
        `).join('')}
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" onclick="window.todoApp.editTodo('${todo.id}')">
          <span class="menu-icon">✏️</span>
          ${t('edit')}
        </button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item danger" onclick="window.todoApp.confirmDelete('${todo.id}')">
          <span class="menu-icon">🗑️</span>
          ${t('deleteTodo')}
        </button>
      </div>
    </div>
  `;
}

export function renderCategoryContextMenu(
  x: number,
  y: number,
  categoryId: string,
  categoryName: string
): string {
  const pos = adjustPosition(x, y);
  return `
    <div class="context-menu-overlay" onclick="window.todoApp.closeContextMenu()">
      <div class="context-menu" style="left: ${pos.x}px; top: ${pos.y}px" onclick="event.stopPropagation()">
        <button class="context-menu-item" onclick="window.todoApp.startEditCategory('${categoryId}')">
          <span class="menu-icon">✏️</span>
          ${t('edit')} "${escapeHtml(categoryName)}"
        </button>
        <button class="context-menu-item danger" onclick="window.todoApp.confirmDeleteCategory('${categoryId}')">
          <span class="menu-icon">🗑️</span>
          ${t('deleteTodo')}
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
