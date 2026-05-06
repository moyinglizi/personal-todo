import type { Category } from '../types';
import { t, type Language } from '../services/i18n';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#78716C',
];

const PRESET_ICONS = [
  '📁', '📋', '💼', '🏠', '🛒', '💪', '🎮', '📚',
  '🎨', '🎵', '🏃', '💊', '🍎', '☕', '📱', '💻',
];

export function renderCategoryManager(
  categories: Category[],
  editingCategory: Category | null,
  selectedColor: string,
  selectedIcon: string,
  editingCategoryName: string,
  onSave: (name: string, color: string, icon: string) => void,
  onCancel: () => void
): string {
  const isEdit = editingCategory !== null;
  const name = editingCategoryName || editingCategory?.name || '';

  const userCategories = categories.filter(c => !c.is_system);

  return `
    <div class="modal-overlay" onclick="window.todoApp.closeCategoryManager()">
      <div class="modal category-manager-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>⚙️ ${t('manageCategories')}</h2>
          <button class="close-btn" onclick="window.todoApp.closeCategoryManager()">×</button>
        </div>
        <div class="modal-body">
          <div class="category-form ${isEdit ? 'editing' : ''}">
            <h3>${isEdit ? t('editCategory') : t('newCategory')}</h3>
            <div class="form-group">
              <label for="cat-name">${t('name')}</label>
              <input type="text" id="cat-name" value="${escapeHtml(name)}" placeholder="${t('name')}" oninput="window.todoApp.onCategoryNameInput(this.value)" onkeydown="if(event.key==='Enter')window.todoApp.saveCategory()" />
            </div>
            <div class="form-group">
              <label>${t('color')}</label>
              <div class="color-picker">
                ${PRESET_COLORS.map(c => `
                  <button
                    class="color-option ${c === selectedColor ? 'selected' : ''}"
                    style="background-color: ${c}"
                    data-color="${c}"
                    onclick="window.todoApp.selectColor('${c}')"
                  ></button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>${t('icon')}</label>
              <div class="icon-picker">
                ${PRESET_ICONS.map(i => `
                  <button
                    class="icon-option ${i === selectedIcon ? 'selected' : ''}"
                    data-icon="${i}"
                    onclick="window.todoApp.selectIcon('${i}')"
                  >
                    ${i}
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-primary" onclick="window.todoApp.saveCategory()">
                ${isEdit ? t('save') : t('create')}
              </button>
            </div>
          </div>

          <div class="category-list-section">
            <h3>${t('yourCategories')}</h3>
            <div class="category-edit-list">
              ${userCategories.length === 0 ? `<p class="empty-state">${t('noCustomCategories')}</p>` : ''}
              ${userCategories.map(cat => `
                <div class="category-edit-item">
                  <span class="cat-preview" style="color: ${cat.color}">${cat.icon}</span>
                  <span class="cat-name">${escapeHtml(cat.name)}</span>
                  <div class="cat-actions">
                    <button class="icon-btn" onclick="window.todoApp.startEditCategory('${cat.id}')" title="${t('edit')}">✏️</button>
                    <button class="icon-btn danger" onclick="window.todoApp.confirmDeleteCategory('${cat.id}')" title="${t('deleteTodo')}">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderSettingsModal(
  hotkey: string,
  theme: string,
  language: string,
  autoStart: boolean,
  categoryCountMode: string,
  onSave: () => void
): string {
  return `
    <div class="modal-overlay" onclick="window.todoApp.closeSettings()">
      <div class="modal settings-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>⚙️ ${t('settings')}</h2>
          <button class="close-btn" onclick="window.todoApp.closeSettings()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="settings-hotkey">${t('globalHotkey')}</label>
            <input type="text" id="settings-hotkey" value="${hotkey}" placeholder="e.g., Ctrl+Shift+T" onkeydown="if(event.key==='Enter')window.todoApp.saveSettings()" style="ime-mode:disabled" />
            <small>${t('globalHotkey')}</small>
          </div>
          <div class="form-group">
            <label for="settings-theme">${t('theme')}</label>
            <select id="settings-theme">
              <option value="light" ${theme === 'light' ? 'selected' : ''}>☀️ ${t('lightTheme')}</option>
              <option value="dark" ${theme === 'dark' ? 'selected' : ''}>🌙 ${t('darkTheme')}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="settings-language">${t('language')}</label>
            <select id="settings-language">
              <option value="zh" ${language === 'zh' ? 'selected' : ''}>中文</option>
              <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="settings-auto-start" ${autoStart ? 'checked' : ''} />
              ${t('autoStart')} - ${t('autoStartDesc')}
            </label>
          </div>
          <div class="form-group">
            <label for="settings-category-count-mode">${t('categoryCountMode')}</label>
            <select id="settings-category-count-mode">
              <option value="uncompleted" ${categoryCountMode === 'uncompleted' ? 'selected' : ''}>${t('categoryCountModeUncompleted')}</option>
              <option value="total" ${categoryCountMode === 'total' ? 'selected' : ''}>${t('categoryCountModeTotal')}</option>
              <option value="completed" ${categoryCountMode === 'completed' ? 'selected' : ''}>${t('categoryCountModeCompleted')}</option>
            </select>
          </div>
          <div class="form-group">
            <button class="btn-secondary" onclick="window.todoApp.resetDailyTodos()">
              🔄 ${t('resetAllDaily')}
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="window.todoApp.closeSettings()">${t('cancel')}</button>
          <button class="btn-primary" onclick="window.todoApp.saveSettings()">${t('save')}</button>
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
