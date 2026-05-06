import { t } from '../services/i18n';
import type { Category } from '../types';

export function renderQuickInput(
  categories: Category[],
  selectedCategoryId: string | null,
  onSubmit: (name: string, dueDate: string) => void,
  onClose: () => void
): string {
  return `
    <div class="modal-overlay" onclick="window.todoApp.closeQuickAdd()">
      <div class="quick-add-modal" onclick="event.stopPropagation()">
        <div class="quick-add-header">
          <h2>➕ ${t('quickAdd')}</h2>
          <button class="close-btn" onclick="window.todoApp.closeQuickAdd()">×</button>
        </div>
        <div class="quick-add-body">
          <div class="form-group">
            <label for="quick-name">${t('nameRequired')}</label>
            <input type="text" id="quick-name" placeholder="${t('quickAddPlaceholder')}" autofocus onkeydown="if(event.key==='Enter')window.todoApp.quickAdd()" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="quick-category">${t('category')}</label>
              <select id="quick-category">
                <option value="">${t('noCategory')}</option>
                ${categories.filter(c => !c.is_system).map(cat => `
                  <option value="${cat.id}" ${cat.id === selectedCategoryId ? 'selected' : ''}>
                    ${cat.icon} ${cat.name}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="quick-status">${t('status')}</label>
              <select id="quick-status">
                <option value="pending" selected>○ ${t('statusPending') || '待办'}</option>
                <option value="in_progress">◐ ${t('statusInProgress') || '进行中'}</option>
                <option value="completed">● ${t('statusCompleted') || '已完成'}</option>
                <option value="blocked">⊘ ${t('statusBlocked') || '阻塞'}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="quick-priority">${t('priority')}</label>
              <select id="quick-priority">
                <option value="low" selected>🟢 ${t('priorityLow').replace('优先级：', '')}</option>
                <option value="medium">🟡 ${t('priorityMedium').replace('优先级：', '')}</option>
                <option value="high">🟠 ${t('priorityHigh').replace('优先级：', '')}</option>
                <option value="urgent">🔴 ${t('priorityUrgent').replace('优先级：', '')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="quick-due">${t('dueDateOptional')}</label>
              <div class="datetime-picker-dropdown">
                <div class="datetime-shortcuts-inline">
                  <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('+15min', 'quick-due', null, 'quick-due')">+15m</button>
                  <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('+30min', 'quick-due', null, 'quick-due')">+30m</button>
                  <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('+1hour', 'quick-due', null, 'quick-due')">+1h</button>
                  <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('tomorrow+9', 'quick-due', null, 'quick-due')">明天9点</button>
                  <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('tomorrow+18', 'quick-due', null, 'quick-due')">明天18点</button>
                </div>
                <input type="datetime-local" id="quick-due" placeholder="${t('dueDateOptional')}" />
              </div>
            </div>
          </div>
          <div class="quick-add-more-toggle">
            <button class="btn-link" onclick="window.todoApp.toggleQuickAddMore()" id="quick-add-more-btn">
              ⚙️ ${t('moreOptions') || '更多选项'} ▼
            </button>
          </div>
          <div class="quick-add-more" id="quick-add-more" style="display: none;">
            <div class="form-group">
              <label for="quick-notes">${t('notes')}</label>
              <textarea id="quick-notes" rows="2" placeholder="${t('notesPlaceholder')}"></textarea>
            </div>
            <div class="form-group">
              <label for="quick-launch">${t('quickLaunch')}</label>
              <input type="text" id="quick-launch" placeholder="${t('quickLaunchPlaceholder')}" />
            </div>
            <div class="form-group">
              <label for="quick-reminders">${t('reminders')}</label>
              <input type="text" id="quick-reminders" placeholder="e.g., 30min, 1hour, at due" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="quick-daily" />
                ${t('dailyTodoDesc')}
              </label>
            </div>
          </div>
        </div>
        <div class="quick-add-footer">
          <button class="btn-secondary" onclick="window.todoApp.closeQuickAdd()">${t('escToCancel')}</button>
          <button class="btn-primary" onclick="window.todoApp.quickAdd()">+ ${t('add')}</button>
        </div>
      </div>
    </div>
  `;
}

export function getQuickInputData(): { name: string; dueDate: string; categoryId: string | null; priority: string; status: string; notes: string; quickLaunch: string; reminders: string; isDaily: boolean } | null {
  const nameInput = document.getElementById('quick-name') as HTMLInputElement;
  const dueInput = document.getElementById('quick-due') as HTMLInputElement;
  const categorySelect = document.getElementById('quick-category') as HTMLSelectElement;
  const prioritySelect = document.getElementById('quick-priority') as HTMLSelectElement;
  const statusSelect = document.getElementById('quick-status') as HTMLSelectElement;
  const notesInput = document.getElementById('quick-notes') as HTMLTextAreaElement;
  const launchInput = document.getElementById('quick-launch') as HTMLInputElement;
  const remindersInput = document.getElementById('quick-reminders') as HTMLInputElement;
  const dailyCheckbox = document.getElementById('quick-daily') as HTMLInputElement;

  if (!nameInput || nameInput.value.trim() === '') {
    return null;
  }

  return {
    name: nameInput.value.trim(),
    dueDate: dueInput.value.trim(),
    categoryId: categorySelect?.value || null,
    priority: prioritySelect?.value || 'low',
    status: statusSelect?.value || 'pending',
    notes: notesInput?.value.trim() || '',
    quickLaunch: launchInput?.value.trim() || '',
    reminders: remindersInput?.value.trim() || '',
    isDaily: dailyCheckbox?.checked || false,
  };
}
