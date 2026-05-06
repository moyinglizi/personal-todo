import type { Todo } from '../types';
import { formatDisplayDate, getDueDateClass } from '../services/parser';
import { t } from '../services/i18n';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '●',
  blocked: '⊘',
};

export interface FlowInfo {
  predecessorCount: number;
  subtaskCount: number;
  isBlocked: boolean;
  depth: number;
}

export function renderTodoItem(
  todo: Todo,
  isSelected: boolean,
  onSelect: () => void,
  onEdit: () => void,
  onToggleStatus: () => void,
  onDelete: () => void,
  flowInfo?: FlowInfo,
  showDragLabels: boolean = false
): string {
  const priorityColor = PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.medium;
  const statusIcon = STATUS_ICONS[todo.status] || STATUS_ICONS.pending;
  const dueDateClass = getDueDateClass(todo.due_date);
  const quickLaunch = todo.quick_launch && todo.quick_launch !== '[]' ? todo.quick_launch : '';

  const priorityLabel: Record<string, string> = {
    urgent: t('priorityUrgent'),
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow'),
  };

  let dueDateDisplay = '';
  if (todo.due_date) {
    dueDateDisplay = formatDisplayDate(new Date(todo.due_date));
  } else if (todo.due_date_display) {
    dueDateDisplay = todo.due_date_display;
  }

  const dailyBadge = todo.is_daily ? '<span class="daily-badge">🔄 Daily</span>' : '';
  const qlIcon = quickLaunch ? '🔗' : '';

  // Flow badges
  const flowBadges = flowInfo ? `
    ${flowInfo.predecessorCount > 0 ? `<span class="flow-badge dependency-badge" title="${t('predecessors')}: ${flowInfo.predecessorCount}">⬆${flowInfo.predecessorCount}</span>` : ''}
    ${flowInfo.subtaskCount > 0 ? `<span class="flow-badge subtask-badge" title="${t('subtasks')}: ${flowInfo.subtaskCount}">⬇${flowInfo.subtaskCount}</span>` : ''}
    ${flowInfo.isBlocked ? `<span class="flow-badge blocked-badge" title="${t('blockedBy')}">⊘</span>` : ''}
  ` : '';

  const depthStyle = flowInfo && flowInfo.depth > 0 ? `margin-left: ${flowInfo.depth * 24}px;` : '';

  return `
    <div class="todo-item ${isSelected ? 'selected' : ''} ${todo.status === 'completed' ? 'completed' : ''} priority-${todo.priority}${flowInfo?.isBlocked ? ' blocked' : ''}"
         data-id="${todo.id}"${showDragLabels ? `
         data-drag-top-label="${t('setAsPrerequisite')}"
         data-drag-bottom-label="${t('setAsSuccessor')}"` : ''}
         style="${depthStyle}"
         onclick="window.todoApp.selectTodo('${todo.id}')"
         ondblclick="window.todoApp.editTodo('${todo.id}')">
      <div class="todo-main">
        <span class="todo-drag-handle"
              data-todo-id="${todo.id}"
              onmousedown="window.todoApp.handleMouseDown(event, '${todo.id}')">⋮⋮</span>
        <span class="todo-status ${todo.status}" onclick="event.stopPropagation(); window.todoApp.toggleStatus('${todo.id}')">${statusIcon}</span>
        <span class="priority-indicator" style="background-color: ${priorityColor}" title="${priorityLabel[todo.priority] || t('priorityMedium')}"></span>
        <div class="todo-content">
          <div class="todo-name">${escapeHtml(todo.name)}</div>
          <div class="todo-meta">
            ${dueDateDisplay ? `<span class="todo-due ${dueDateClass}">📅 ${dueDateDisplay}</span>` : ''}
            ${dailyBadge}
            ${flowBadges}
            <span class="priority-label" style="color: ${priorityColor}">${priorityLabel[todo.priority] || t('priorityMedium')}</span>
          </div>
        </div>
        <div class="todo-actions">
          ${quickLaunch ? `
            <button class="quick-launch-btn" onclick="window.todoApp.handleQuickLaunchClick(event, '${encodeURIComponent(quickLaunch)}')" title="${t('quickLaunch')} (Ctrl+Click)">
              ${qlIcon}
            </button>
          ` : ''}
          <button class="todo-menu-btn" onclick="event.stopPropagation(); window.todoApp.showContextMenu(event, '${todo.id}')">⋮</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
