import type { Todo, Category, Settings, Shortcuts, FilterStatus, SortBy, AppState } from './types';
import { getTodos, createTodo, updateTodo, deleteTodo, getCategories, getSettings, updateSettings, resetDailyTodos as apiResetDaily, createCategory, updateCategory, deleteCategory, reorderCategories, openPath, stringifyReminders, setAutoStart } from './services/storage';
import { parseFlexibleDate } from './services/parser';
import { reminderScheduler } from './services/reminder';
import { checkDailyReset } from './services/dailyReset';
import { renderTodoItem } from './components/TodoItem';
import { renderTodoForm, getFormData } from './components/TodoForm';
import { renderCategoryPanel } from './components/CategoryPanel';
import { renderQuickInput, getQuickInputData } from './components/QuickInput';
import { renderSearchBar } from './components/SearchBar';
import { renderFilterBar } from './components/FilterBar';
import { renderContextMenu, renderCategoryContextMenu } from './components/ContextMenu';
import { renderCategoryManager, renderSettingsModal } from './components/CategoryManager';
import { renderConfirmModal } from './components/ConfirmModal';
import { t, setLanguage, getTranslations, type Language } from './services/i18n';

class TodoApp {
  private state: AppState = {
    todos: [],
    categories: [],
    settings: {
      hotkey: 'Ctrl+Shift+T',
      theme: 'light',
      language: 'zh' as Language,
      auto_start: false,
      category_count_mode: 'uncompleted' as const,
      shortcuts: { openQuickAdd: 'n', focusSearch: '/', navigateDown: 'j', navigateUp: 'k', save: 'Enter', close: 'Escape' }
    },
    filterStatus: 'all',
    filterCategory: null,
    sortBy: 'position',
    sortOrder: 'asc',
    searchQuery: '',
    selectedTodoId: null,
    editingTodo: null,
    isQuickAddOpen: false,
    isSettingsOpen: false,
    isCategoryManagerOpen: false,
    isConfirmOpen: false,
    confirmType: null,
    confirmTargetId: null,
    draggingTodoId: null,
    draggingCategoryId: null,
    todoListScrollTop: 0,
  };

  private selectedColor: string = '#3B82F6';
  private selectedIcon: string = '📁';
  private editingCategoryId: string | null = null;
  private editingCategoryName: string = '';

  async init() {
    try {
      await this.loadData();
      await this.applyLanguage();
      await reminderScheduler.init();
      this.applyTheme();
      this.render();
      this.setupKeyboardShortcuts();
      this.setupReminderPolling();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  private async loadData() {
    try {
      this.state.todos = await getTodos();
      this.state.todos = checkDailyReset(this.state.todos);
      this.state.categories = await getCategories();
      const settings = await getSettings();
      // shortcuts is already parsed by storage.getSettings
      this.state.settings.shortcuts = settings.shortcuts;
      this.state.settings.hotkey = settings.hotkey;
      this.state.settings.theme = settings.theme as 'light' | 'dark';
      this.state.settings.language = settings.language as 'en' | 'zh';
      this.state.settings.auto_start = settings.auto_start;
      this.state.settings.category_count_mode = settings.category_count_mode as 'total' | 'uncompleted' | 'completed';
    } catch (error) {
      console.error('Failed to load data:', error);
      this.state.todos = [];
      this.state.categories = [];
    }
  }

  private async loadCategories() {
    this.state.categories = await getCategories();
  }

  private async applyLanguage() {
    setLanguage(this.state.settings.language as Language);
  }

  private setupKeyboardShortcuts() {
    const shortcuts = this.state.settings.shortcuts;

    document.addEventListener('keydown', (e) => {
      // Check if capturing shortcut
      const capturingInput = document.querySelector('.shortcut-input.capturing') as HTMLInputElement;
      if (capturingInput) {
        e.preventDefault();
        e.stopPropagation();
        const key = this.formatKey(e);
        capturingInput.value = key;
        capturingInput.classList.remove('capturing');
        capturingInput.blur();
        return;
      }

      const sc = this.state.settings.shortcuts;

      // Close shortcut
      if (e.key === sc.close) {
        if (this.state.isQuickAddOpen) {
          this.closeQuickAdd();
        } else if (this.state.editingTodo !== null) {
          this.closeModal();
        } else if (this.state.isSettingsOpen) {
          this.closeSettings();
        } else if (this.state.isCategoryManagerOpen) {
          this.closeCategoryManager();
        }
        this.closeContextMenu();
      }

      // Open quick add (when not in input)
      if (e.key === sc.openQuickAdd && !this.isInputFocused()) {
        e.preventDefault();
        this.openQuickAdd();
      }

      // Focus search
      if ((e.key === sc.focusSearch || (e.ctrlKey && e.key === 'f')) && !this.state.isQuickAddOpen && this.state.editingTodo === null) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        searchInput?.focus();
      }

      // Navigate
      if (!this.isInputFocused() && !this.state.isQuickAddOpen && this.state.editingTodo === null) {
        if (e.key === sc.navigateDown || e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateDown();
        }
        if (e.key === sc.navigateUp || e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateUp();
        }
      }

      // Save (when quick add or modal is open and not in input)
      if (e.key === sc.save && !this.isInputFocused()) {
        if (this.state.isQuickAddOpen) {
          this.quickAdd();
        } else if (this.state.editingTodo !== null) {
          this.saveTodo();
        } else if (this.state.isSettingsOpen) {
          this.saveSettings();
        } else if (this.state.isCategoryManagerOpen) {
          this.saveCategory();
        } else if (this.state.isConfirmOpen) {
          this.executeConfirm();
        } else if (this.state.selectedTodoId) {
          this.editTodo(this.state.selectedTodoId);
        }
      }
    });
  }

  private formatKey(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');
    const key = e.key;
    if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    }
    return parts.join('+');
  }

  startCaptureShortcut(input: HTMLInputElement) {
    input.classList.add('capturing');
    input.value = t('pressAnyKey');
    input.focus();
  }

  private isInputFocused(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;
  }

  private navigateDown() {
    const filtered = this.getFilteredTodos();
    if (filtered.length === 0) return;

    const currentIndex = filtered.findIndex(t => t.id === this.state.selectedTodoId);
    const nextIndex = currentIndex < filtered.length - 1 ? currentIndex + 1 : 0;
    this.state.selectedTodoId = filtered[nextIndex].id;
    this.render();
  }

  private navigateUp() {
    const filtered = this.getFilteredTodos();
    if (filtered.length === 0) return;

    const currentIndex = filtered.findIndex(t => t.id === this.state.selectedTodoId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filtered.length - 1;
    this.state.selectedTodoId = filtered[prevIndex].id;
    this.render();
  }

  private setupReminderPolling() {
    // Check reminders every minute
    setInterval(() => {
      for (const todo of this.state.todos) {
        if ((todo.due_date || (todo.is_daily && todo.daily_time)) && todo.status !== 'completed') {
          reminderScheduler.schedule(todo);
        }
      }
    }, 60000);
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.state.settings.theme);
  }

  private getFilteredTodos(): Todo[] {
    let filtered = [...this.state.todos];

    // Filter by status
    if (this.state.filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === this.state.filterStatus);
    }

    // Filter by category (including 'daily' virtual category)
    if (this.state.filterCategory !== null) {
      if (this.state.filterCategory === 'daily') {
        filtered = filtered.filter(t => t.is_daily);
      } else {
        filtered = filtered.filter(t => t.category_id === this.state.filterCategory);
      }
    }

    // Filter by search
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.notes.toLowerCase().includes(query)
      );
    }

    // Sort - completed always last when showing all
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
      // Always sort completed to the bottom
      if (this.state.filterStatus === 'all') {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
      }

      let cmp = 0;
      switch (this.state.sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) cmp = 0;
          else if (!a.due_date) cmp = 1;
          else if (!b.due_date) cmp = -1;
          else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          cmp = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
          break;
        case 'created_at':
          cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        default:
          cmp = a.position - b.position;
      }
      return this.state.sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }

  private render() {
    const root = document.getElementById('app');
    if (!root) return;

    // Save scroll position before innerHTML replacement
    const todoListEl = document.querySelector('.todo-list');
    const savedScroll = todoListEl ? (todoListEl as HTMLElement).scrollTop : 0;

    const trans = getTranslations();
    const filteredTodos = this.getFilteredTodos();
    const completedCount = this.state.todos.filter(t => t.status === 'completed').length;
    const dailyCount = this.state.todos.filter(t => t.is_daily).length;

    root.innerHTML = `
      <div class="app-container">
        ${renderCategoryPanel(
          this.state.categories,
          this.state.todos,
          this.state.filterCategory,
          this.state.settings.category_count_mode,
          (id) => this.selectCategory(id),
          () => this.openCategoryManager()
        )}
        <div class="main-content">
          <div class="top-bar">
            ${renderSearchBar(this.state.searchQuery, (q) => this.search(q))}
            <button class="btn-primary quick-add-btn" onclick="window.todoApp.openQuickAdd()">
              + ${t('quickAdd')}
            </button>
          </div>
          ${renderFilterBar(
            this.state.filterStatus,
            this.state.sortBy,
            (s) => this.setFilter(s),
            (s) => this.setSort(s)
          )}
          <div class="todo-list">
            ${filteredTodos.length === 0 ? `
              <div class="empty-state">
                <p>${t('noTodosYet')}</p>
                <button class="btn-primary" onclick="window.todoApp.openQuickAdd()">${t('addFirstTodo')}</button>
              </div>
            ` : filteredTodos.map(todo => renderTodoItem(
              todo,
              todo.id === this.state.selectedTodoId,
              () => this.selectTodo(todo.id),
              () => this.editTodo(todo.id),
              () => this.toggleStatus(todo.id),
              () => this.confirmDelete(todo.id)
            )).join('')}
          </div>
          <div class="trash-zone ${this.state.draggingTodoId ? 'active' : ''}">
            <span class="trash-icon">🗑️</span>
            <span class="trash-text">${t('dropToDelete')}</span>
          </div>
          <div class="status-bar">
            <span>${filteredTodos.length} ${t('todos')} • ${completedCount} ${t('completedCount')}${dailyCount > 0 ? ` (${dailyCount} ${t('daily')})` : ''}</span>
            <div class="status-actions">
              <button class="icon-btn" onclick="window.todoApp.openSettings()" title="${t('settings')}">⚙️</button>
              <button class="icon-btn" onclick="window.todoApp.toggleTheme()" title="${t('theme')}">
                ${this.state.settings.theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button class="icon-btn" onclick="window.todoApp.toggleLanguage()" title="${t('language')}">
                ${this.state.settings.language === 'zh' ? 'EN' : '中'}
              </button>
            </div>
          </div>
        </div>
      </div>
      ${this.state.isQuickAddOpen ? renderQuickInput(this.state.categories, this.state.filterCategory, () => this.quickAdd(), () => this.closeQuickAdd()) : ''}
        <div class="drag-status-panel ${this.state.draggingTodoId ? 'active' : ''}" id="drag-status-panel">
          <div class="drag-status-item" data-status="pending" onmouseenter="window.todoApp.handleStatusDragOver(event, 'pending')" onclick="window.todoApp.dropOnStatus('pending')">○ 待办</div>
          <div class="drag-status-item" data-status="in_progress" onmouseenter="window.todoApp.handleStatusDragOver(event, 'in_progress')" onclick="window.todoApp.dropOnStatus('in_progress')">◐ 进行中</div>
          <div class="drag-status-item" data-status="completed" onmouseenter="window.todoApp.handleStatusDragOver(event, 'completed')" onclick="window.todoApp.dropOnStatus('completed')">● 已完成</div>
          <div class="drag-status-item" data-status="blocked" onmouseenter="window.todoApp.handleStatusDragOver(event, 'blocked')" onclick="window.todoApp.dropOnStatus('blocked')">⊘ 阻塞</div>
        </div>
      ${this.state.editingTodo !== null ? renderTodoForm(
        this.state.editingTodo,
        this.state.categories,
        () => this.saveTodo(),
        () => this.closeModal(),
        () => this.deleteTodo()
      ) : ''}
      ${this.state.isSettingsOpen ? renderSettingsModal(
        this.state.settings.hotkey,
        this.state.settings.theme,
        this.state.settings.language,
        this.state.settings.auto_start,
        this.state.settings.category_count_mode,
        this.state.settings.shortcuts,
        () => this.saveSettings()
      ) : ''}
      ${this.state.isConfirmOpen ? renderConfirmModal(
        this.state.confirmType === 'todo' ? t('confirmDelete') : t('confirmDeleteCategory'),
        this.state.confirmType === 'todo' ? t('confirmDelete') : t('categoryDeleteWarning')
      ) : ''}
    `;

    // Schedule reminders for visible todos
    for (const todo of this.state.todos) {
      if ((todo.due_date || (todo.is_daily && todo.daily_time)) && todo.status !== 'completed') {
        reminderScheduler.schedule(todo);
      }
    }

    // Restore scroll position after innerHTML replacement
    const tl = document.querySelector('.todo-list') as HTMLElement;
    if (tl && savedScroll > 0) {
      tl.scrollTop = 0;  // Reset first to override browser default
      tl.scrollTop = savedScroll;  // Then restore
    }
  }

  // Actions
  async refresh() {
    await this.loadData();
    this.render();
  }

  selectTodo(id: string) {
    this.state.selectedTodoId = id;
    this.render();
  }

  selectCategory(id: string | null) {
    this.state.filterCategory = id;
    this.state.selectedTodoId = null;
    this.render();
  }

  search(query: string) {
    this.state.searchQuery = query;
    this.render();
  }

  clearSearch() {
    this.state.searchQuery = '';
    this.render();
  }

  setFilter(status: FilterStatus) {
    this.state.filterStatus = status;
    this.render();
  }

  setSort(sort: SortBy) {
    this.state.sortBy = sort;
    this.render();
  }

  openQuickAdd() {
    this.closeContextMenu();
    this.state.isQuickAddOpen = true;
    this.render();
    setTimeout(() => {
      const input = document.getElementById('quick-name') as HTMLInputElement;
      input?.focus();
    }, 50);
  }

  closeQuickAdd() {
    this.state.isQuickAddOpen = false;
    this.render();
  }

  toggleQuickAddMore() {
    const moreSection = document.getElementById('quick-add-more');
    const btn = document.getElementById('quick-add-more-btn');
    if (moreSection && btn) {
      const isHidden = moreSection.style.display === 'none';
      moreSection.style.display = isHidden ? 'block' : 'none';
      btn.innerHTML = isHidden ? `⚙️ ${t('moreOptions')} ▲` : `⚙️ ${t('moreOptions')} ▼`;
    }
  }

  handleQuickDueChange(select: HTMLSelectElement) {
    const customInput = document.getElementById('quick-due') as HTMLInputElement;
    if (!customInput) return;

    if (select.value === 'custom') {
      customInput.style.display = '';
      customInput.focus();
      select.style.display = 'none';
    } else if (select.value) {
      // Calculate datetime based on selection
      const now = new Date();
      let targetDate: Date;

      if (select.value.startsWith('tomorrow+')) {
        const hour = parseInt(select.value.replace('tomorrow+', ''));
        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0);
      } else if (select.value.startsWith('+')) {
        const match = select.value.match(/\+(\d+)(min|hour)/);
        if (match) {
          const value = parseInt(match[1]);
          if (match[2] === 'min') {
            targetDate = new Date(now.getTime() + value * 60 * 1000);
          } else {
            targetDate = new Date(now.getTime() + value * 60 * 60 * 1000);
          }
        } else {
          return;
        }
      } else {
        return;
      }

      // Format for datetime-local input
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const hours = String(targetDate.getHours()).padStart(2, '0');
      const mins = String(targetDate.getMinutes()).padStart(2, '0');
      customInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
      customInput.style.display = '';
      select.style.display = 'none';
    }
  }

  handleTodoDueChange(select: HTMLSelectElement) {
    const customInput = document.getElementById('todo-due-date') as HTMLInputElement;
    if (!customInput) return;

    if (select.value === 'custom') {
      customInput.style.display = '';
      customInput.focus();
      select.style.display = 'none';
    } else if (select.value) {
      const now = new Date();
      let targetDate: Date;

      if (select.value.startsWith('tomorrow+')) {
        const hour = parseInt(select.value.replace('tomorrow+', ''));
        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0);
      } else if (select.value.startsWith('+')) {
        const match = select.value.match(/\+(\d+)(min|hour)/);
        if (match) {
          const value = parseInt(match[1]);
          if (match[2] === 'min') {
            targetDate = new Date(now.getTime() + value * 60 * 1000);
          } else {
            targetDate = new Date(now.getTime() + value * 60 * 60 * 1000);
          }
        } else {
          return;
        }
      } else {
        return;
      }

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const hours = String(targetDate.getHours()).padStart(2, '0');
      const mins = String(targetDate.getMinutes()).padStart(2, '0');
      customInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
      customInput.style.display = '';
      select.style.display = 'none';
    }
  }

  handleDailyTimeChange(select: HTMLSelectElement) {
    const customInput = document.getElementById('todo-daily-time') as HTMLInputElement;
    if (!customInput) return;

    if (select.value === 'custom') {
      customInput.style.display = '';
      customInput.focus();
      select.style.display = 'none';
    } else if (select.value) {
      customInput.value = select.value;
      customInput.style.display = '';
      select.style.display = 'none';
    }
  }

  setDueDatePreset(preset: string, inputId: string = 'todo-due-date') {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;

    const now = new Date();
    let targetDate: Date;

    if (preset.startsWith('tomorrow+')) {
      const hour = parseInt(preset.replace('tomorrow+', ''));
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0);
    } else if (preset.startsWith('+')) {
      const match = preset.match(/\+(\d+)(min|hour)/);
      if (!match) return;
      const value = parseInt(match[1]);
      if (match[2] === 'min') {
        targetDate = new Date(now.getTime() + value * 60 * 1000);
      } else {
        targetDate = new Date(now.getTime() + value * 60 * 60 * 1000);
      }
    } else {
      return;
    }

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const mins = String(targetDate.getMinutes()).padStart(2, '0');
    input.value = `${year}-${month}-${day}T${hours}:${mins}`;
  }

  toggleDueDatePicker(inputId: string, panelId: string, autoFocus = false) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Close all other panels first
    document.querySelectorAll('.datetime-picker-panel').forEach(p => {
      if (p.id !== panelId) {
        (p as HTMLElement).style.display = 'none';
      }
    });

    const isHidden = panel.style.display === 'none' || panel.style.display === '';
    panel.style.display = isHidden ? 'flex' : 'none';

    // Auto focus the datetime-local input to show the picker
    if (isHidden && autoFocus) {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input) {
        setTimeout(() => input.focus(), 0);
      }
    }
  }

  selectDuePreset(preset: string, inputId: string, panelId: string | null, displayId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;

    const now = new Date();
    let targetDate: Date;

    if (preset.startsWith('tomorrow+')) {
      const hour = parseInt(preset.replace('tomorrow+', ''));
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0);
    } else if (preset.startsWith('+')) {
      const match = preset.match(/\+(\d+)(min|hour)/);
      if (!match) return;
      const value = parseInt(match[1]);
      if (match[2] === 'min') {
        targetDate = new Date(now.getTime() + value * 60 * 1000);
      } else {
        targetDate = new Date(now.getTime() + value * 60 * 60 * 1000);
      }
    } else {
      return;
    }

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const mins = String(targetDate.getMinutes()).padStart(2, '0');
    const dateValue = `${year}-${month}-${day}T${hours}:${mins}`;
    input.value = dateValue;
  }

  updateDueDateDisplay(inputId: string, displayId: string) {
    // No longer needed with inline picker
  }

  async quickAdd() {
    const data = getQuickInputData();
    if (!data) return;

    const { date, display } = parseFlexibleDate(data.dueDate);

    try {
      const todo = await createTodo(
        data.name,
        date ? date.toISOString() : null,
        data.dueDate || null,
        data.categoryId,
        data.priority,
        data.isDaily,
        data.status
      );
      this.state.todos.push(todo);

      // Update additional fields via updateTodo
      if (data.notes || data.quickLaunch || data.reminders) {
        const todoObj = this.state.todos.find(t => t.id === todo.id);
        if (todoObj) {
          todoObj.notes = data.notes;
          todoObj.quick_launch = data.quickLaunch || null;
          todoObj.reminders = data.reminders ? JSON.stringify(data.reminders) : '';
          await updateTodo(todo.id, todoObj.name, todoObj.due_date, todoObj.due_date_display, todoObj.status, data.notes, data.quickLaunch || null, data.reminders, todoObj.category_id, todoObj.priority, todoObj.is_daily);
        }
      }
      this.state.isQuickAddOpen = false;
      this.render();
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  }

  editTodo(id: string) {
    this.closeContextMenu();
    const todo = this.state.todos.find(t => t.id === id);
    if (todo) {
      this.state.editingTodo = todo;
      this.render();
      setTimeout(() => {
        const input = document.getElementById('todo-name') as HTMLInputElement;
        input?.focus();
      }, 50);
    }
  }

  closeModal() {
    this.state.editingTodo = null;
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
    }
    this.render();
  }

  cancelModal() {
    this.state.editingTodo = null;
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
    }
    this.render();
  }

  toggleDailyTimeVisibility(isDaily: boolean) {
    const dailyTimeGroup = document.getElementById('daily-time-group');
    if (dailyTimeGroup) {
      dailyTimeGroup.style.display = isDaily ? '' : 'none';
    }
  }

  async saveTodo() {
    const data = getFormData();
    if (!data || !this.state.editingTodo) return;

    try {
      await updateTodo(
        this.state.editingTodo.id,
        data.name,
        data.dueDate,
        data.dueDateDisplay,
        data.status,
        data.notes,
        data.quickLaunch,
        JSON.stringify(data.reminders),
        data.categoryId,
        data.priority,
        data.isDaily,
        data.dailyTime
      );

      const index = this.state.todos.findIndex(t => t.id === this.state.editingTodo!.id);
      if (index !== -1) {
        this.state.todos[index] = {
          ...this.state.todos[index],
          name: data.name,
          due_date: data.dueDate,
          due_date_display: data.dueDateDisplay,
          status: data.status as Todo['status'],
          notes: data.notes,
          quick_launch: data.quickLaunch,
          reminders: JSON.stringify(data.reminders),
          category_id: data.categoryId,
          priority: data.priority as Todo['priority'],
          is_daily: data.isDaily,
          daily_time: data.dailyTime,
        };
      }

      this.state.editingTodo = null;
      this.render();
    } catch (error) {
      console.error('Failed to save todo:', error);
    }
  }

  async deleteTodo() {
    if (!this.state.editingTodo) return;

    try {
      await deleteTodo(this.state.editingTodo.id);
      this.state.todos = this.state.todos.filter(t => t.id !== this.state.editingTodo!.id);
      reminderScheduler.cancel(this.state.editingTodo.id);
      this.state.editingTodo = null;
      this.render();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }

  confirmDelete(id: string) {
    this.closeContextMenu();
    this.state.confirmType = 'todo';
    this.state.confirmTargetId = id;
    this.state.isConfirmOpen = true;
    this.render();
  }

  closeConfirmModal() {
    this.state.isConfirmOpen = false;
    this.state.confirmType = null;
    this.state.confirmTargetId = null;
    this.render();
  }

  async executeConfirm() {
    if (!this.state.confirmType || !this.state.confirmTargetId) {
      this.closeConfirmModal();
      return;
    }

    const id = this.state.confirmTargetId;

    if (this.state.confirmType === 'todo') {
      try {
        await deleteTodo(id);
        this.state.todos = this.state.todos.filter(t => t.id !== id);
        reminderScheduler.cancel(id);
        if (this.state.selectedTodoId === id) {
          this.state.selectedTodoId = null;
        }
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    } else if (this.state.confirmType === 'category') {
      try {
        await deleteCategory(id);
        this.state.categories = this.state.categories.filter(c => c.id !== id);
        this.state.todos = this.state.todos.map(t =>
          t.category_id === id ? { ...t, category_id: null } : t
        );
        if (this.state.filterCategory === id) {
          this.state.filterCategory = null;
        }
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }

    this.closeConfirmModal();
  }

  async toggleStatus(id: string) {
    const todo = this.state.todos.find(t => t.id === id);
    if (!todo) return;

    const statusOrder: Todo['status'][] = ['pending', 'in_progress', 'completed', 'blocked'];
    const currentIndex = statusOrder.indexOf(todo.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    try {
      await updateTodo(
        todo.id,
        todo.name,
        todo.due_date,
        todo.due_date_display,
        nextStatus,
        todo.notes,
        todo.quick_launch,
        todo.reminders,
        todo.category_id,
        todo.priority,
        todo.is_daily
      );

      todo.status = nextStatus;
      this.render();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async setTodoStatus(id: string, status: string) {
    const todo = this.state.todos.find(t => t.id === id);
    if (!todo) return;

    try {
      await updateTodo(
        todo.id,
        todo.name,
        todo.due_date,
        todo.due_date_display,
        status,
        todo.notes,
        todo.quick_launch,
        todo.reminders,
        todo.category_id,
        todo.priority,
        todo.is_daily
      );

      todo.status = status as Todo['status'];
      this.closeContextMenu();
      this.render();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async openQuickLaunch(value: string) {
    console.log('openQuickLaunch called with:', value);
    try {
      await openPath(value);
    } catch (error) {
      console.error('Failed to open path:', error);
    }
  }

  handleQuickLaunchClick(event: MouseEvent, encodedValue: string) {
    event.stopPropagation();
    event.preventDefault();
    console.log('handleQuickLaunchClick called, encodedValue:', encodedValue);
    const value = decodeURIComponent(encodedValue);
    console.log('Decoded value:', value);
    this.openQuickLaunch(value);
  }

  showContextMenu(event: MouseEvent, id: string) {
    const todo = this.state.todos.find(t => t.id === id);
    if (!todo) return;

    event.preventDefault();
    const menu = renderContextMenu(event.clientX, event.clientY, todo, () => this.closeContextMenu());
    this.closeContextMenu();

    const menuRoot = document.createElement('div');
    menuRoot.id = 'context-menu-root';
    menuRoot.innerHTML = menu;
    document.body.appendChild(menuRoot);
  }

  showCategoryContextMenu(event: MouseEvent, id: string) {
    event.preventDefault();
    const category = this.state.categories.find(c => c.id === id);
    if (!category) return;

    const menu = renderCategoryContextMenu(event.clientX, event.clientY, id, category.name);
    this.closeContextMenu();

    const menuRoot = document.createElement('div');
    menuRoot.id = 'context-menu-root';
    menuRoot.innerHTML = menu;
    document.body.appendChild(menuRoot);
  }

  closeContextMenu() {
    const menu = document.getElementById('context-menu-root');
    if (menu) {
      menu.remove();
    }
  }

  openSettings() {
    this.state.isSettingsOpen = true;
    this.render();
  }

  closeSettings() {
    this.state.isSettingsOpen = false;
    this.render();
  }

  async saveSettings() {
    const hotkeyInput = document.getElementById('settings-hotkey') as HTMLInputElement;
    const themeSelect = document.getElementById('settings-theme') as HTMLSelectElement;
    const languageSelect = document.getElementById('settings-language') as HTMLSelectElement;
    const autoStartCheckbox = document.getElementById('settings-auto-start') as HTMLInputElement;
    const categoryCountModeSelect = document.getElementById('settings-category-count-mode') as HTMLSelectElement;

    if (!hotkeyInput || !themeSelect || !languageSelect || !categoryCountModeSelect) {
      return;
    }

    // Get shortcuts from UI
    const shortcutInputs = document.querySelectorAll('.shortcut-input');
    const shortcuts: Shortcuts = { openQuickAdd: 'n', focusSearch: '/', navigateDown: 'j', navigateUp: 'k', save: 'Enter', close: 'Escape' };
    shortcutInputs.forEach((input) => {
      const el = input as HTMLInputElement;
      const key = el.dataset.shortcut as keyof Shortcuts;
      if (key && key in shortcuts) {
        shortcuts[key] = el.value;
      }
    });

    const newLanguage = languageSelect.value as Language;
    const newAutoStart = autoStartCheckbox.checked;
    const newCategoryCountMode = categoryCountModeSelect.value as 'total' | 'uncompleted' | 'completed';

    try {
      await updateSettings(hotkeyInput.value, themeSelect.value, newLanguage, newAutoStart, newCategoryCountMode, JSON.stringify(shortcuts));
      await setAutoStart(newAutoStart);

      this.state.settings.hotkey = hotkeyInput.value;
      this.state.settings.theme = themeSelect.value as 'light' | 'dark';
      this.state.settings.language = newLanguage;
      this.state.settings.auto_start = newAutoStart;
      this.state.settings.category_count_mode = newCategoryCountMode;
      this.state.settings.shortcuts = shortcuts;

      setLanguage(newLanguage);
      this.applyTheme();
      this.state.isSettingsOpen = false;
      this.render();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + error);
    }
  }

  async toggleTheme() {
    const newTheme = this.state.settings.theme === 'light' ? 'dark' : 'light';
    try {
      await updateSettings(this.state.settings.hotkey, newTheme, this.state.settings.language, this.state.settings.auto_start, this.state.settings.category_count_mode, JSON.stringify(this.state.settings.shortcuts));
      this.state.settings.theme = newTheme;
      this.applyTheme();
      this.render();
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    }
  }

  async toggleLanguage() {
    const newLanguage = this.state.settings.language === 'zh' ? 'en' : 'zh';
    try {
      await updateSettings(this.state.settings.hotkey, this.state.settings.theme, newLanguage, this.state.settings.auto_start, this.state.settings.category_count_mode, JSON.stringify(this.state.settings.shortcuts));
      this.state.settings.language = newLanguage;
      setLanguage(newLanguage);
      this.render();
    } catch (error) {
      console.error('Failed to toggle language:', error);
    }
  }

  async resetDailyTodos() {
    try {
      await apiResetDaily();
      await this.refresh();
    } catch (error) {
      console.error('Failed to reset daily todos:', error);
    }
  }

  // Category Manager
  openCategoryManager() {
    this.closeContextMenu();
    this.state.isCategoryManagerOpen = true;
    this.editingCategoryId = null;
    this.editingCategoryName = '';
    this.selectedColor = '#3B82F6';
    this.selectedIcon = '📁';
    this.renderCategoryManager();
  }

  closeCategoryManager() {
    this.state.isCategoryManagerOpen = false;
    this.editingCategoryId = null;
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
    }
    this.render();
  }

  private renderCategoryManager() {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) {
      const root = document.getElementById('app');
      if (!root) return;
      const div = document.createElement('div');
      div.innerHTML = renderCategoryManager(
        this.state.categories,
        this.editingCategoryId ? this.state.categories.find(c => c.id === this.editingCategoryId) || null : null,
        this.selectedColor,
        this.selectedIcon,
        this.editingCategoryName,
        () => this.saveCategory(),
        () => this.closeCategoryManager()
      );
      document.body.appendChild(div.firstElementChild!);
    } else {
      modal.outerHTML = renderCategoryManager(
        this.state.categories,
        this.editingCategoryId ? this.state.categories.find(c => c.id === this.editingCategoryId) || null : null,
        this.selectedColor,
        this.selectedIcon,
        this.editingCategoryName,
        () => this.saveCategory(),
        () => this.closeCategoryManager()
      );
    }
  }

  selectColor(color: string) {
    this.selectedColor = color;
    this.renderCategoryManager();
  }

  selectIcon(icon: string) {
    this.selectedIcon = icon;
    this.renderCategoryManager();
  }

  async saveCategory() {
    const nameInput = document.getElementById('cat-name') as HTMLInputElement;
    if (!nameInput || nameInput.value.trim() === '') return;

    try {
      if (this.editingCategoryId) {
        await updateCategory(this.editingCategoryId, nameInput.value.trim(), this.selectedColor, this.selectedIcon);
        const index = this.state.categories.findIndex(c => c.id === this.editingCategoryId);
        if (index !== -1) {
          this.state.categories[index] = {
            ...this.state.categories[index],
            name: nameInput.value.trim(),
            color: this.selectedColor,
            icon: this.selectedIcon,
          };
        }
      } else {
        const newCat = await createCategory(nameInput.value.trim(), this.selectedColor, this.selectedIcon);
        this.state.categories.push(newCat);
      }

      this.editingCategoryId = null;
      this.editingCategoryName = '';
      this.renderCategoryManager();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  }

  startEditCategory(id: string) {
    this.closeContextMenu();
    const category = this.state.categories.find(c => c.id === id);
    if (category) {
      this.editingCategoryId = id;
      this.editingCategoryName = category.name;
      this.selectedColor = category.color;
      this.selectedIcon = category.icon;
      this.renderCategoryManager();

      const nameInput = document.getElementById('cat-name') as HTMLInputElement;
      nameInput?.focus();
    }
  }

  cancelEditCategory() {
    this.editingCategoryId = null;
    this.editingCategoryName = '';
    this.renderCategoryManager();
  }

  onCategoryNameInput(value: string) {
    this.editingCategoryName = value;
  }

  async deleteCategory(id: string) {
    if (!confirm(t('categoryDeleteWarning'))) return;

    try {
      await deleteCategory(id);
      this.state.categories = this.state.categories.filter(c => c.id !== id);
      this.state.todos.forEach(t => {
        if (t.category_id === id) {
          t.category_id = null;
        }
      });
      if (this.state.filterCategory === id) {
        this.state.filterCategory = null;
      }
      // If editing this category, clear edit mode
      if (this.editingCategoryId === id) {
        this.editingCategoryId = null;
        this.editingCategoryName = '';
      }
      // Refresh categories from backend to ensure consistency
      this.state.categories = await getCategories();
      this.renderCategoryManager();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  }

  confirmDeleteCategory(id: string) {
    this.closeContextMenu();
    this.state.confirmType = 'category';
    this.state.confirmTargetId = id;
    this.state.isConfirmOpen = true;
    this.render();
  }

  addCategory() {
    this.editingCategoryId = null;
    this.renderCategoryManager();
  }

  // Custom Mouse-based Drag and Drop
  private isDragging = false;
  private dragGhost: HTMLElement | null = null;

  handleMouseDown(event: MouseEvent, todoId: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this.state.draggingTodoId = todoId;
    this.isDragging = true;

    // Set grabbing cursor
    const handle = document.querySelector(`.todo-drag-handle[data-todo-id="${todoId}"]`) as HTMLElement;
    if (handle) handle.style.cursor = 'grabbing';

    // Add dragging class
    const todoItem = document.querySelector(`.todo-item[data-id="${todoId}"]`);
    if (todoItem) {
      todoItem.classList.add('dragging');
      (todoItem as HTMLElement).style.opacity = '0.4';
    }

    // Show trash zone
    const trashZone = document.querySelector('.trash-zone') as HTMLElement;
    if (trashZone) trashZone.classList.add('active');

    // Show status panel
    const statusPanel = document.querySelector('.drag-status-panel') as HTMLElement;
    if (statusPanel) statusPanel.classList.add('active');

    // Create ghost element with smooth animation
    if (todoItem) {
      this.dragGhost = (todoItem as HTMLElement).cloneNode(true) as HTMLElement;
      this.dragGhost.style.position = 'fixed';
      this.dragGhost.style.pointerEvents = 'none';
      this.dragGhost.style.opacity = '0';
      this.dragGhost.style.zIndex = '9999';
      // Shrink ghost width to 60% for compact dragging feel
      this.dragGhost.style.width = ((todoItem as HTMLElement).offsetWidth * 0.6) + 'px';
      this.dragGhost.style.maxWidth = ((todoItem as HTMLElement).offsetWidth * 0.6) + 'px';
      this.dragGhost.style.left = event.clientX - ((todoItem as HTMLElement).offsetWidth * 0.3) + 'px';
      this.dragGhost.style.top = event.clientY - 10 + 'px';
      this.dragGhost.style.transform = 'rotate(3deg)';
      this.dragGhost.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)';
      this.dragGhost.style.transition = 'transform 0.12s ease-out, opacity 0.15s ease-out, width 0.2s ease-out';
      this.dragGhost.style.overflow = 'hidden';
      this.dragGhost.style.borderRadius = '8px';
      this.dragGhost.style.textOverflow = 'ellipsis';
      this.dragGhost.style.whiteSpace = 'nowrap';
      // Hide drag handle and context menu in ghost
      const ghostHandle = this.dragGhost.querySelector('.todo-drag-handle');
      if (ghostHandle) (ghostHandle as HTMLElement).style.display = 'none';
      const ghostMenu = this.dragGhost.querySelector('.todo-menu-btn');
      if (ghostMenu) (ghostMenu as HTMLElement).style.display = 'none';
      document.body.appendChild(this.dragGhost);

      // Animate ghost in
      requestAnimationFrame(() => {
        if (this.dragGhost) {
          this.dragGhost.style.opacity = '0.9';
          this.dragGhost.style.transform = 'scale(1) rotate(0deg)';
        }
      });
    }

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseMove = (event: MouseEvent) => {
    if (!this.isDragging || !this.dragGhost) return;

    // Smooth ghost movement with slight lag for fluidity
    const dx = event.clientX - 20 - parseInt(this.dragGhost.style.left || '0');
    const dy = event.clientY - 20 - parseInt(this.dragGhost.style.top || '0');

    this.dragGhost.style.left = (parseInt(this.dragGhost.style.left || '0') + dx * 0.3) + 'px';
    this.dragGhost.style.top = (parseInt(this.dragGhost.style.top || '0') + dy * 0.3) + 'px';

    // Add subtle rotation based on movement direction
    const rotation = Math.max(-8, Math.min(8, dx * 0.3));
    this.dragGhost.style.transform = `rotate(${rotation}deg)`;

    // Check trash zone
    const trashZone = document.querySelector('.trash-zone') as HTMLElement;
    if (trashZone) {
      const rect = trashZone.getBoundingClientRect();
      const isOverTrash = event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (isOverTrash) {
        trashZone.classList.add('drag-over');
        this.dragGhost.style.transform = 'scale(1.1) rotate(0deg)';
        this.dragGhost.style.boxShadow = '0 12px 40px rgba(239, 68, 68, 0.4)';
      } else {
        trashZone.classList.remove('drag-over');
        this.dragGhost.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
      }
    }

    // Check categories
    document.querySelectorAll('.category-item').forEach(cat => {
      const rect = (cat as HTMLElement).getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom) {
        cat.classList.add('drag-over');
      } else {
        cat.classList.remove('drag-over');
      }
    });

    // Check todo items
    document.querySelectorAll('.todo-item').forEach(item => {
      const rect = (item as HTMLElement).getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom &&
          item.getAttribute('data-id') !== this.state.draggingTodoId) {
        item.classList.add('drag-over');
      } else {
        item.classList.remove('drag-over');
      }
    });

    // Check status panel
    const statusPanel = document.querySelector('.drag-status-panel');
    if (statusPanel) {
      const rect = (statusPanel as HTMLElement).getBoundingClientRect();
      const isOverPanel = event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (isOverPanel) {
        const statusItem = document.elementFromPoint(event.clientX, event.clientY);
        document.querySelectorAll('.drag-status-item').forEach(el => el.classList.remove('drag-over'));
        if (statusItem?.closest('.drag-status-item')) {
          statusItem.closest('.drag-status-item')?.classList.add('drag-over');
        }
      }
    }
  };

  handleMouseUp = async (event: MouseEvent) => {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    const todoId = this.state.draggingTodoId;

    // Check if over trash zone BEFORE removing ghost and classes
    const trashZone = document.querySelector('.trash-zone') as HTMLElement;
    let isOverTrash = false;
    if (trashZone) {
      const rect = trashZone.getBoundingClientRect();
      isOverTrash = event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom;
    }

    // Animate ghost out
    if (this.dragGhost) {
      this.dragGhost.style.transition = 'all 0.2s ease-out';
      if (isOverTrash) {
        this.dragGhost.style.opacity = '0';
        this.dragGhost.style.transform = 'scale(0.5) rotate(-20deg)';
        this.dragGhost.style.top = (parseInt(this.dragGhost.style.top || '0') + 50) + 'px';
      } else {
        this.dragGhost.style.opacity = '0';
        this.dragGhost.style.transform = 'scale(0.8)';
      }
      await new Promise(r => setTimeout(r, 200));
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    // Reset cursor
    document.querySelectorAll('.todo-drag-handle').forEach(el => {
      (el as HTMLElement).style.cursor = 'grab';
    });

    if (!todoId) return;

    // Remove dragging class and restore opacity
    const todoItem = document.querySelector(`.todo-item[data-id="${todoId}"]`);
    if (todoItem) {
      todoItem.classList.remove('dragging');
      (todoItem as HTMLElement).style.opacity = '';
    }

    // Hide trash zone
    if (trashZone) {
      trashZone.classList.remove('active');
      trashZone.classList.remove('drag-over');
    }

    // Check trash zone drop
    if (isOverTrash) {
      // Direct delete without confirmation
      try {
        await deleteTodo(todoId);
        this.state.todos = this.state.todos.filter(t => t.id !== todoId);
        reminderScheduler.cancel(todoId);
        if (this.state.selectedTodoId === todoId) {
          this.state.selectedTodoId = null;
        }
        this.render();
      } catch (err) {
        console.error('Failed to delete todo:', err);
      }
      this.clearDragState();
      return;
    }

    const target = event.target as HTMLElement;

    // Check category drop
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
    const categoryItem = dropTarget?.closest('.category-item');
    if (categoryItem) {
      const categoryId = categoryItem.getAttribute('data-category-id');
      // 'all' means no category (uncategorize) - same as null
      if (categoryId === 'all' || categoryId === null || categoryId === '') {
        const todo = this.state.todos.find(t => t.id === todoId);
        if (todo) {
          try {
            await updateTodo(
              todo.id, todo.name, todo.due_date, todo.due_date_display, todo.status,
              todo.notes, todo.quick_launch, todo.reminders, null,
              todo.priority, todo.is_daily
            );
            this.state.todos = await getTodos();
            this.render();
          } catch (err) {
            console.error('Failed to update todo category:', err);
          }
        }
        this.clearDragState();
        return;
      }
      // Skip 'daily' - it's a filter, not a real category
      if (categoryId === 'daily') {
        this.clearDragState();
        return;
      }
      const todo = this.state.todos.find(t => t.id === todoId);
      if (todo) {
        try {
          await updateTodo(
            todo.id, todo.name, todo.due_date, todo.due_date_display, todo.status,
            todo.notes, todo.quick_launch, todo.reminders, categoryId,
            todo.priority, todo.is_daily
          );
          this.state.todos = await getTodos();
          this.render();
        } catch (err) {
          console.error('Failed to update todo category:', err);
        }
      }
      this.clearDragState();
      return;
    }

    // Check status panel drop
    const statusItem = target.closest('.drag-status-item');
    if (statusItem) {
      const status = statusItem.getAttribute('data-status');
      if (status) {
        const todo = this.state.todos.find(t => t.id === todoId);
        if (todo) {
          try {
            await updateTodo(
              todo.id, todo.name, todo.due_date, todo.due_date_display, status,
              todo.notes, todo.quick_launch, todo.reminders, todo.category_id,
              todo.priority, todo.is_daily
            );
            this.state.todos = await getTodos();
            this.render();
          } catch (err) {
            console.error('Failed to update todo status:', err);
          }
        }
      }
      this.clearDragState();
      return;
    }

    // Check todo reordering
    const targetTodoItem = target.closest('.todo-item') as HTMLElement;
    if (targetTodoItem && targetTodoItem !== todoItem) {
      const targetId = targetTodoItem.getAttribute('data-id');
      if (targetId && targetId !== todoId) {
        const draggedIndex = this.state.todos.findIndex(t => t.id === todoId);
        const targetIndex = this.state.todos.findIndex(t => t.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedTodo] = this.state.todos.splice(draggedIndex, 1);
          this.state.todos.splice(targetIndex, 0, draggedTodo);

          for (const t of this.state.todos) {
            t.position = this.state.todos.indexOf(t);
            await updateTodo(
              t.id, t.name, t.due_date, t.due_date_display, t.status,
              t.notes, t.quick_launch, t.reminders, t.category_id,
              t.priority, t.is_daily
            );
          }

          this.render();
        }
      }
    }

    this.clearDragState();
  };

  clearDragState() {
    this.state.draggingTodoId = null;
    this.state.draggingCategoryId = null;
    document.querySelectorAll('.todo-item').forEach(el => {
      el.classList.remove('dragging');
      el.classList.remove('drag-over');
    });
    document.querySelectorAll('.category-item').forEach(el => {
      el.classList.remove('drag-over');
    });
    document.querySelectorAll('.drag-status-item').forEach(el => {
      el.classList.remove('drag-over');
    });
    // Hide trash zone
    const trashZone = document.querySelector('.trash-zone');
    if (trashZone) {
      trashZone.classList.remove('active');
      trashZone.classList.remove('drag-over');
    }
    // Hide status panel
    const statusPanel = document.querySelector('.drag-status-panel');
    if (statusPanel) statusPanel.classList.remove('active');
  }

  handleStatusDragOver(event: MouseEvent, status: string) {
    document.querySelectorAll('.drag-status-item').forEach(el => el.classList.remove('drag-over'));
    const item = document.querySelector(`.drag-status-item[data-status="${status}"]`);
    if (item) item.classList.add('drag-over');
  }

  async dropOnStatus(status: string) {
    const todoId = this.state.draggingTodoId;
    if (!todoId) return;

    const todo = this.state.todos.find(t => t.id === todoId);
    if (!todo) {
      this.clearDragState();
      return;
    }

    try {
      await updateTodo(
        todo.id, todo.name, todo.due_date, todo.due_date_display, status,
        todo.notes, todo.quick_launch, todo.reminders, todo.category_id,
        todo.priority, todo.is_daily
      );
      this.state.todos = await getTodos();
      this.render();
    } catch (err) {
      console.error('Failed to update todo status:', err);
    }

    this.clearDragState();
  }

  // Legacy handlers (no longer used)
  handleDragStart(event: DragEvent, todoId: string) {}
  handleDragEnd(event: DragEvent) {}
  handleDragOver(event: DragEvent) {}
  handleDragLeave(event: DragEvent) {}
  handleCategoryDragStart(event: DragEvent, categoryId: string) {}
  handleCategoryDragEnd() {}
  handleCategoryDragOver(event: DragEvent, targetCategoryId: string) {}
  handleCategoryDrop(event: DragEvent, targetCategoryId: string) {}
  handleDrop(event: DragEvent) {}
  handleTrashDrop(event: DragEvent) {}
}

// Initialize app
const app = new TodoApp();
(window as any).todoApp = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

export default app;