import type { Todo, Category, Reminder } from '../types';
import { parseReminders } from '../services/storage';
import { t } from '../services/i18n';

export function renderTodoForm(
  todo: Todo | null,
  categories: Category[],
  onSave: (data: TodoFormData) => void,
  onCancel: () => void,
  onDelete: () => void
): string {
  const isEdit = todo !== null;
  const title = isEdit ? t('editTodo') : t('newTodo');

  const name = todo?.name || '';
  const notes = todo?.notes || '';
  const dueDateInput = todo?.due_date_display || '';
  const priority = todo?.priority || 'medium';
  const status = todo?.status || 'pending';
  const categoryId = todo?.category_id || '';
  const isDaily = todo?.is_daily || false;
  const quickLaunch = (todo?.quick_launch && todo.quick_launch !== '[]') ? todo.quick_launch : '';
  const reminders = todo ? parseReminders(todo.reminders) : [];
  const dailyTime = todo?.daily_time || '';

  return `
    <div class="modal-overlay" onclick="window.todoApp.closeModal()">
      <div class="modal todo-form-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>${isEdit ? '✏️' : '➕'} ${title}</h2>
          <button class="close-btn" onclick="window.todoApp.closeModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="todo-name">${t('nameRequired')}</label>
            <input type="text" id="todo-name" value="${escapeHtml(name)}" placeholder="${t('nameRequired')}" onkeydown="if(event.key==='Enter')window.todoApp.saveTodo()" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="todo-priority">${t('priority')}</label>
              <select id="todo-priority">
                <option value="low" ${priority === 'low' ? 'selected' : ''} style="color: #22C55E">${t('priorityLow')}</option>
                <option value="medium" ${priority === 'medium' ? 'selected' : ''} style="color: #EAB308">${t('priorityMedium')}</option>
                <option value="high" ${priority === 'high' ? 'selected' : ''} style="color: #F97316">${t('priorityHigh')}</option>
                <option value="urgent" ${priority === 'urgent' ? 'selected' : ''} style="color: #EF4444">${t('priorityUrgent')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="todo-status">${t('status')}</label>
              <select id="todo-status">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>${t('statusPending')}</option>
                <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>${t('statusInProgress')}</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>${t('statusCompleted')}</option>
                <option value="blocked" ${status === 'blocked' ? 'selected' : ''}>${t('statusBlocked')}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="todo-due-date">${t('dueDate')}</label>
            <div class="datetime-picker-dropdown">
              <div class="datetime-shortcuts-inline">
                <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('+15min', 'todo-due-date', null, 'todo-due-date')">+15m</button>
                <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('+30min', 'todo-due-date', null, 'todo-due-date')">+30m</button>
                <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('+1hour', 'todo-due-date', null, 'todo-due-date')">+1h</button>
                <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('tomorrow+9', 'todo-due-date', null, 'todo-due-date')">明天9点</button>
                <button type="button" class="datetime-shortcut-inline" onclick="window.todoApp.selectDuePreset('tomorrow+18', 'todo-due-date', null, 'todo-due-date')">明天18点</button>
              </div>
              <input type="datetime-local" id="todo-due-date" value="${todo?.due_date ? todo.due_date.slice(0, 16) : ''}" placeholder="${t('dueDateOptional')}" />
            </div>
          </div>

          <div class="form-group">
            <label for="todo-category">${t('category')}</label>
            <select id="todo-category">
              <option value="">${t('noCategory')}</option>
              ${categories.filter(cat => !cat.is_system).map(cat => `
                <option value="${cat.id}" ${cat.id === categoryId ? 'selected' : ''}>
                  ${cat.icon} ${cat.name}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="todo-is-daily" ${isDaily ? 'checked' : ''} onchange="window.todoApp.toggleDailyTimeVisibility(this.checked)" />
              ${t('dailyTodoDesc')}
            </label>
          </div>

          <div class="form-group daily-time-group" id="daily-time-group" style="${isDaily ? '' : 'display: none;'}">
            <label for="todo-daily-time">${t('dailyTime')}</label>
            <div class="datetime-quick-select">
              <select id="todo-daily-select" onchange="window.todoApp.handleDailyTimeChange(this)">
                <option value="">-- ${t('selectTime') || 'Select time'} --</option>
                <option value="06:00" ${dailyTime === '06:00' ? 'selected' : ''}>06:00</option>
                <option value="07:00" ${dailyTime === '07:00' ? 'selected' : ''}>07:00</option>
                <option value="08:00" ${dailyTime === '08:00' ? 'selected' : ''}>08:00</option>
                <option value="09:00" ${dailyTime === '09:00' ? 'selected' : ''}>09:00</option>
                <option value="10:00" ${dailyTime === '10:00' ? 'selected' : ''}>10:00</option>
                <option value="11:00" ${dailyTime === '11:00' ? 'selected' : ''}>11:00</option>
                <option value="12:00" ${dailyTime === '12:00' ? 'selected' : ''}>12:00</option>
                <option value="13:00" ${dailyTime === '13:00' ? 'selected' : ''}>13:00</option>
                <option value="14:00" ${dailyTime === '14:00' ? 'selected' : ''}>14:00</option>
                <option value="15:00" ${dailyTime === '15:00' ? 'selected' : ''}>15:00</option>
                <option value="16:00" ${dailyTime === '16:00' ? 'selected' : ''}>16:00</option>
                <option value="17:00" ${dailyTime === '17:00' ? 'selected' : ''}>17:00</option>
                <option value="18:00" ${dailyTime === '18:00' ? 'selected' : ''}>18:00</option>
                <option value="19:00" ${dailyTime === '19:00' ? 'selected' : ''}>19:00</option>
                <option value="20:00" ${dailyTime === '20:00' ? 'selected' : ''}>20:00</option>
                <option value="21:00" ${dailyTime === '21:00' ? 'selected' : ''}>21:00</option>
                <option value="22:00" ${dailyTime === '22:00' ? 'selected' : ''}>22:00</option>
                <option value="custom">📅 Custom...</option>
              </select>
              <input type="time" id="todo-daily-time" value="${dailyTime}" style="display: none;" />
            </div>
            <small style="color: var(--text-secondary);">${t('dailyTimeDesc')}</small>
          </div>

          ${isDaily && dailyTime ? `
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="todo-daily-reminder" ${reminders.length > 0 ? 'checked' : ''} />
                ${t('enableDailyReminder')}
              </label>
              <small style="color: var(--text-secondary);">${t('dailyReminderDesc')}</small>
            </div>
          ` : `
            <div class="form-group">
              <label>${t('reminders')}</label>
              <div class="reminder-options">
                ${[60, 30, 15, 0].map(mins => {
                  const reminder = reminders.find((r: Reminder) => r.offsetMinutes === -mins);
                  return `
                    <label class="reminder-checkbox">
                      <input type="checkbox" class="reminder-check" data-minutes="${mins}"
                        ${reminder && !reminder.triggered ? 'checked' : ''} />
                      ${mins === 0 ? t('atDueTime') : `${mins} ${t('minutesBefore')}`}
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          `}

          <div class="form-group">
            <label>${t('quickLaunch')}</label>
            <input type="text" id="ql-value" value="${escapeHtml(quickLaunch)}" placeholder="${t('quickLaunchPlaceholder')}" style="width: 100%;" />
          </div>

          <div class="form-group">
            <label for="todo-notes">${t('notes')}</label>
            <textarea id="todo-notes" rows="4" placeholder="${t('notesPlaceholder')}">${escapeHtml(notes)}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          ${isEdit ? `<button class="btn-danger" onclick="window.todoApp.deleteTodo()">${t('deleteTodo')}</button>` : ''}
          <div class="footer-right">
            <button class="btn-secondary" onclick="window.todoApp.cancelModal()">${t('cancel')}</button>
            <button class="btn-primary" onclick="window.todoApp.saveTodo()">${t('save')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export interface TodoFormData {
  name: string;
  dueDate: string | null;
  dueDateDisplay: string | null;
  status: string;
  notes: string;
  quickLaunch: string | null;
  reminders: Reminder[];
  categoryId: string | null;
  priority: string;
  isDaily: boolean;
  dailyTime: string | null;
}

export function getFormData(): TodoFormData | null {
  const nameInput = document.getElementById('todo-name') as HTMLInputElement;
  const dueDateInput = document.getElementById('todo-due-date') as HTMLInputElement;
  const prioritySelect = document.getElementById('todo-priority') as HTMLSelectElement;
  const statusSelect = document.getElementById('todo-status') as HTMLSelectElement;
  const categorySelect = document.getElementById('todo-category') as HTMLSelectElement;
  const isDailyCheckbox = document.getElementById('todo-is-daily') as HTMLInputElement;
  const notesTextarea = document.getElementById('todo-notes') as HTMLTextAreaElement;
  const qlValueInput = document.getElementById('ql-value') as HTMLInputElement;
  const dailyTimeInput = document.getElementById('todo-daily-time') as HTMLInputElement;

  if (!nameInput || nameInput.value.trim() === '') {
    nameInput?.focus();
    return null;
  }

  const { date, display } = (() => {
    const val = dueDateInput.value;
    if (!val) return { date: null, display: null };
    const parsed = new Date(val);
    return { date: parsed, display: val };
  })();

  // Get quick launch value
  const quickLaunch = qlValueInput?.value.trim() || null;

  // Get reminders
  const reminders: Reminder[] = [];
  const isDailyChecked = isDailyCheckbox.checked;
  const dailyTimeVal = dailyTimeInput?.value || null;

  if (isDailyChecked && dailyTimeVal) {
    // Daily reminder: use checkbox to enable/disable
    const dailyReminderCheck = document.getElementById('todo-daily-reminder') as HTMLInputElement;
    if (dailyReminderCheck?.checked) {
      reminders.push({
        id: 'daily',
        offsetMinutes: 0,
        triggered: false,
      });
    }
  } else {
    // Regular due-date reminders
    const reminderChecks = document.querySelectorAll('.reminder-check');
    reminderChecks.forEach((check) => {
      const input = check as HTMLInputElement;
      if (input.checked) {
        reminders.push({
          id: crypto.randomUUID(),
          offsetMinutes: -parseInt(input.dataset.minutes || '0'),
          triggered: false,
        });
      }
    });
  }

  return {
    name: nameInput.value.trim(),
    dueDate: date ? date.toISOString() : null,
    dueDateDisplay: dueDateInput.value.trim() || null,
    status: statusSelect.value,
    notes: notesTextarea.value,
    quickLaunch,
    reminders,
    categoryId: categorySelect.value || null,
    priority: prioritySelect.value,
    isDaily: isDailyCheckbox.checked,
    dailyTime: isDailyCheckbox.checked ? (dailyTimeInput?.value || null) : null,
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDisplayDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}
