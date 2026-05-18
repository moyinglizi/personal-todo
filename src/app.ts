import type { Todo, Category, Settings, Shortcuts, FilterStatus, SortBy, AppState } from './types';
import { getTodos, createTodo, updateTodo, deleteTodo, getCategories, getSettings, updateSettings, resetDailyTodos as apiResetDaily, createCategory, updateCategory, deleteCategory, reorderCategories, openPath, stringifyReminders, setAutoStart, getDependencies, addDependency, removeDependency, setParent } from './services/storage';
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
import { renderFlowCanvas, NODE_W, NODE_H, bezierD } from './components/FlowCanvas';
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
    dependencies: [],
    flowViewOpen: false,
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
      this.state.dependencies = await getDependencies();
      this.flowNodePositions.clear();
      this.applyCompletedSort();
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

    // Sort (completed-to-bottom is applied separately on navigation actions)
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
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
          <div class="filter-row">
            <div class="view-toggle">
              <button class="view-btn ${!this.state.flowViewOpen ? 'active' : ''}"
                      onclick="window.todoApp.setViewMode(false)">${t('listView')}</button>
              <button class="view-btn ${this.state.flowViewOpen ? 'active' : ''}"
                      onclick="window.todoApp.setViewMode(true)">${t('flowView')}</button>
            </div>
            ${renderFilterBar(
              this.state.filterStatus,
              this.state.sortBy,
              this.state.sortOrder,
              (s) => this.setFilter(s),
              (s) => this.setSort(s),
              () => this.toggleSortOrder()
            )}
          </div>
          <div class="todo-list">
            ${filteredTodos.length === 0 ? `
              <div class="empty-state">
                <p>${t('noTodosYet')}</p>
                <button class="btn-primary" onclick="window.todoApp.openQuickAdd()">${t('addFirstTodo')}</button>
              </div>
            ` : this.renderTodoList(filteredTodos)}
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
        () => this.deleteTodo(),
        this.state.todos,
        this.state.dependencies
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
        this.state.confirmType === 'clearDeps' ? t('confirmClearDeps') : this.state.confirmType === 'todo' ? t('confirmDelete') : t('confirmDeleteCategory'),
        this.state.confirmType === 'clearDeps' ? t('confirmClearDepsDesc') : this.state.confirmType === 'todo' ? t('confirmDelete') : t('categoryDeleteWarning')
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
      tl.scrollTop = 0;
      tl.scrollTop = savedScroll;
    }

    // Restore flow canvas zoom/pan state
    for (const [index] of this.flowCanvasZoom) {
      requestAnimationFrame(() => this.applyFlowCanvasTransform(index));
    }
    // Auto-fit first render (no saved zoom)
    if (this.state.flowViewOpen && !this.flowCanvasZoom.has(0)) {
      requestAnimationFrame(() => this.autoFitFlowCanvas(0));
    }
  }

  private autoFitFlowCanvas(index: number) {
    const container = document.querySelector(`#flow-scene-${index}`)?.parentElement;
    const scene = document.getElementById(`flow-scene-${index}`);
    const svg = scene?.querySelector('.flow-svg') as SVGElement;
    if (!container || !svg) return;
    const cw = container.clientWidth - 20;
    const ch = container.clientHeight - 20;
    const sw = parseFloat(svg.getAttribute('width') || '0');
    const sh = parseFloat(svg.getAttribute('height') || '0');
    if (sw <= 0 || sh <= 0) return;
    const scale = Math.min(cw / sw, ch / sh, 1.5);
    this.flowCanvasZoom.set(index, scale);
    this.flowCanvasPanX.set(index, 0);
    this.flowCanvasPanY.set(index, 0);
    this.applyFlowCanvasTransform(index);
  }

  private renderTodoList(filteredTodos: Todo[]): string {
    try {
      if (this.state.flowViewOpen) {
        return this.renderFlowView(filteredTodos);
      }
      // List view
      return filteredTodos.map(todo => this.renderTodoWithInfo(todo, 0)).join('');
    } catch (err) {
      console.error('renderTodoList error:', err);
      return filteredTodos.map(todo => this.renderTodoWithInfo(todo, 0)).join('');
    }
  }

  private renderTodoWithInfo(todo: Todo, depth: number, showDragLabels = false): string {
    const predecessors = this.getPredecessors(todo.id);
    const subtodos = this.getSubtodos(todo.id);
    const isBlocked = this.hasIncompletePredecessors(todo.id);
    return renderTodoItem(
      todo,
      todo.id === this.state.selectedTodoId,
      () => this.selectTodo(todo.id),
      () => this.editTodo(todo.id),
      () => this.toggleStatus(todo.id),
      () => this.confirmDelete(todo.id),
      { predecessorCount: predecessors.length, subtaskCount: subtodos.length, isBlocked, depth },
      showDragLabels
    );
  }

  private renderFlowView(filteredTodos: Todo[]): string {
    // Read-only for "全部" (all todos), editable for specific categories
    const readOnly = this.state.filterCategory === null;
    const hasItems = filteredTodos.length > 0;
    const canvasIndex = 0;

    const canvasHtml = hasItems
      ? `
        <div class="flow-canvas-container"
             onwheel="window.todoApp.flowCanvasWheel(${canvasIndex}, event)"
             onmousedown="window.todoApp.flowCanvasPanStart(${canvasIndex}, event)">
          <div class="flow-canvas-scene" id="flow-scene-${canvasIndex}">
            ${renderFlowCanvas(filteredTodos, this.state.dependencies, canvasIndex, this.flowNodePositions, readOnly)}
          </div>
        </div>
      ` : `
        <div class="flow-empty-state">
          <div class="flow-empty-icon">🔗</div>
          <p class="flow-empty-title">${t('noFlowsYet')}</p>
          <p class="flow-empty-hint">${t('flowHint')}</p>
        </div>
      `;

    return `
      <div class="flow-group">
        <div class="flow-group-header">
          <span class="flow-group-icon">🔗</span>
          <span class="flow-group-name">${t('flowView')}</span>
          <span class="flow-group-count">${filteredTodos.length}</span>
          ${readOnly ? `<span class="flow-readonly-badge" title="${t('flowReadonly')}">🔒 ${t('flowReadonly')}</span>` : ''}
          ${!readOnly ? `<button class="btn-small btn-danger-clear" onclick="window.todoApp.clearAllDependencies()" title="${t('clearAllDeps')}">🗑 ${t('clearAllDeps')}</button>` : ''}
          <div class="flow-chart-controls">
            <button class="flow-zoom-btn" onclick="window.todoApp.flowCanvasZoomBtn(${canvasIndex}, -0.2)">−</button>
            <button class="flow-zoom-btn" onclick="window.todoApp.flowCanvasZoomBtn(${canvasIndex}, 0.2)">+</button>
            <button class="flow-zoom-btn" onclick="window.todoApp.flowCanvasReset(${canvasIndex})">↺</button>
          </div>
        </div>
        ${canvasHtml}
        ${hasItems ? `
        <div class="flow-todo-list-header">${t('todoItems')}</div>
        <div class="flow-todo-list">
          ${filteredTodos.map(todo => {
            const depth = this.computeDepth(todo.id);
            return `<div class="flow-item-row" style="--flow-depth:${depth};">
                      ${this.renderTodoWithInfo(todo, depth, true)}
                    </div>`;
          }).join('')}
        </div>` : ''}
      </div>
    `;
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

  private applyCompletedSort() {
    if (this.state.filterStatus !== 'all') return;
    const active: Todo[] = [];
    const completed: Todo[] = [];
    for (const t of this.state.todos) {
      if (t.status === 'completed') completed.push(t);
      else active.push(t);
    }
    let pos = 0;
    for (const t of active) t.position = pos++;
    for (const t of completed) t.position = pos++;
  }

  selectCategory(id: string | null) {
    this.state.filterCategory = id;
    this.state.selectedTodoId = null;
    this.applyCompletedSort();
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
    this.applyCompletedSort();
    this.render();
  }

  setSort(sort: SortBy) {
    this.state.sortBy = sort;
    this.applyCompletedSort();
    this.render();
  }

  toggleSortOrder() {
    this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
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
    // Prevent dblclick from opening edit right after a rapid status toggle
    if (Date.now() - this.lastStatusToggle < 500) return;
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
    if (this.state.confirmType === 'clearDeps') {
      await this.executeClearDependencies();
      this.closeConfirmModal();
      return;
    }
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
    } else if (this.state.confirmType === 'clearDeps') {
      await this.executeClearDependencies();
    }

    this.closeConfirmModal();
  }

  async toggleStatus(id: string) {
    this.lastStatusToggle = Date.now();
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
        todo.is_daily,
        todo.parent_id
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
        todo.is_daily,
        todo.parent_id
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

    // Check todo items (with split-zone for drag-to-flow)
    document.querySelectorAll('.todo-item').forEach(item => {
      const rect = (item as HTMLElement).getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom &&
          item.getAttribute('data-id') !== this.state.draggingTodoId) {
        const relativeY = (event.clientY - rect.top) / rect.height;

        item.classList.add('drag-over');
        if (relativeY < 0.4) {
          item.classList.add('drag-over-top');
          item.classList.remove('drag-over-bottom');
        } else if (relativeY > 0.6) {
          item.classList.add('drag-over-bottom');
          item.classList.remove('drag-over-top');
        } else {
          item.classList.remove('drag-over-top');
          item.classList.remove('drag-over-bottom');
        }
      } else {
        item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
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

    // Check drop on flow canvas node (from list to chart)
    const canvasNode = target.closest('.flow-node') as HTMLElement;
    if (canvasNode && !target.closest('.flow-item-row')) {
      const targetId = canvasNode.dataset.todoId;
      if (targetId && targetId !== todoId) {
        const rect = canvasNode.getBoundingClientRect();
        const rx = (event.clientX - rect.left) / rect.width;
        const ry = (event.clientY - rect.top) / rect.height;
        const draggedTodo = this.state.todos.find(t => t.id === todoId);
        const targetTodo = this.state.todos.find(t => t.id === targetId);

        try {
          if (ry > 0.6) {
            // Bottom zone: make subtask
            const hasDeps = this.state.dependencies.some(d => d.predecessor_id === todoId || d.successor_id === todoId);
            if (hasDeps) { this.showToast(t('hasDepsNoSubtask')); this.clearDragState(); return; }
            if (targetTodo?.parent_id) { this.showToast(t('noSubtaskOfSubtask')); this.clearDragState(); return; }
            const sourceHasChildren = this.state.todos.some(t => t.parent_id === todoId);
            if (sourceHasChildren) { this.showToast(t('hasChildrenNoSubtask')); this.clearDragState(); return; }
            await setParent(todoId, targetId);
            if (draggedTodo) draggedTodo.parent_id = targetId;
          } else if (rx < 0.4) {
            // Left zone: dragged is predecessor of target (dragged → target)
            if (draggedTodo?.parent_id) { await setParent(todoId, null); if (draggedTodo) draggedTodo.parent_id = null; }
            if (targetTodo?.parent_id) { await setParent(targetId, null); targetTodo!.parent_id = null; }
            await addDependency(todoId, targetId);
          } else {
            // Right zone: dragged is successor of target (target → dragged)
            if (draggedTodo?.parent_id) { await setParent(todoId, null); if (draggedTodo) draggedTodo.parent_id = null; }
            if (targetTodo?.parent_id) { await setParent(targetId, null); targetTodo!.parent_id = null; }
            await addDependency(targetId, todoId);
          }
          this.state.dependencies = await getDependencies();
          this.render();
        } catch (err) { this.showToast(this.translateError(err)); }
      }
      this.clearDragState();
      return;
    }

    // Check todo reordering (no relationship editing in list view)
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
      el.classList.remove('drag-over-top');
      el.classList.remove('drag-over-bottom');
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

  // Flow/pipeline helpers
  private getPredecessors(todoId: string): Todo[] {
    const predIds = this.state.dependencies
      .filter(d => d.successor_id === todoId)
      .map(d => d.predecessor_id);
    return this.state.todos.filter(t => predIds.includes(t.id));
  }

  private getSubtodos(todoId: string): Todo[] {
    return this.state.todos.filter(t => t.parent_id === todoId);
  }

  private hasIncompletePredecessors(todoId: string): boolean {
    return this.getPredecessors(todoId).some(p => p.status !== 'completed');
  }

  private areSubtasksComplete(todoId: string): boolean {
    const subtodos = this.getSubtodos(todoId);
    if (subtodos.length === 0) return true;
    return subtodos.every(t => t.status === 'completed');
  }

  private canSetStatus(todoId: string, newStatus: string): { allowed: boolean; reason: string } {
    if (newStatus === 'in_progress' || newStatus === 'completed') {
      if (this.hasIncompletePredecessors(todoId)) {
        const blockedBy = this.getPredecessors(todoId)
          .filter(p => p.status !== 'completed')
          .map(p => p.name)
          .join(', ');
        return { allowed: false, reason: `${t('blockedBy')}: ${blockedBy}` };
      }
    }
    if (newStatus === 'completed') {
      if (!this.areSubtasksComplete(todoId)) {
        return { allowed: false, reason: t('completeSubtasksFirst') };
      }
    }
    return { allowed: true, reason: '' };
  }

  private computeDepth(todoId: string, visited = new Set<string>()): number {
    if (visited.has(todoId)) return 0;
    visited.add(todoId);
    const todo = this.state.todos.find(t => t.id === todoId);
    if (!todo || !todo.parent_id) return 0;
    return 1 + this.computeDepth(todo.parent_id, visited);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private translateError(err: unknown): string {
    const msg = String(err);
    if (msg.includes('Circular dependency')) return t('circularDependency');
    if (msg.includes('depend on itself')) return t('selfDependency');
    if (msg.includes('own parent')) return t('selfParent');
    if (msg.includes('already exists')) return t('dependencyExists');
    return msg;
  }

  private showToast(message: string) {
    const existing = document.querySelector('.flow-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'flow-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  private lastStatusToggle = 0;

  setViewMode(isFlow: boolean) {
    this.state.flowViewOpen = isFlow;
    this.render();
  }

  // Flow chart zoom/pan state (keyed by flow index)
  // --- FlowCanvas interaction state (per-flow-index, not serialized) ---
  private flowCanvasZoom: Map<number, number> = new Map();
  private flowCanvasPanX: Map<number, number> = new Map();
  private flowCanvasPanY: Map<number, number> = new Map();
  private flowNodePositions: Map<string, { x: number; y: number }> = new Map();
  private flowCanvasDrag: {
    type: 'node' | 'handle' | 'pan' | 'edge';
    flowIndex: number;
    sourceId?: string;
    handle?: string;
    startX: number;
    startY: number;
    ghost?: HTMLElement;
    origLeft?: number;
    origTop?: number;
  } | null = null;

  // Zoom via button
  flowCanvasZoomBtn(index: number, delta: number) {
    const cur = this.flowCanvasZoom.get(index) || 1;
    const next = Math.max(0.3, Math.min(3, cur + delta));
    this.flowCanvasZoom.set(index, next);
    this.applyFlowCanvasTransform(index);
  }

  // Zoom via wheel
  flowCanvasWheel(index: number, event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.flowCanvasZoomBtn(index, delta);
  }

  // Reset zoom/pan and node positions
  flowCanvasReset(index: number) {
    this.flowCanvasZoom.delete(index);
    this.flowCanvasPanX.delete(index);
    this.flowCanvasPanY.delete(index);
    this.flowNodePositions.clear();
    this.render();
  }

  // Apply CSS transform to a flow canvas scene
  applyFlowCanvasTransform(index: number) {
    const scene = document.getElementById(`flow-scene-${index}`);
    if (!scene) return;
    const z = this.flowCanvasZoom.get(index) || 1;
    const px = this.flowCanvasPanX.get(index) || 0;
    const py = this.flowCanvasPanY.get(index) || 0;
    scene.style.transform = `scale(${z}) translate(${px}px, ${py}px)`;
  }

  // Pan start (mousedown on canvas background)
  flowCanvasPanStart(index: number, event: MouseEvent) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.flow-node') ||
        (event.target as HTMLElement).closest('.flow-node-handle')) return;
    event.preventDefault();
    this.flowCanvasDrag = { type: 'pan', flowIndex: index, startX: event.clientX, startY: event.clientY };
    const onMove = (e: MouseEvent) => {
      if (!this.flowCanvasDrag || this.flowCanvasDrag.type !== 'pan') return;
      const dx = e.clientX - this.flowCanvasDrag.startX;
      const dy = e.clientY - this.flowCanvasDrag.startY;
      this.flowCanvasDrag.startX = e.clientX;
      this.flowCanvasDrag.startY = e.clientY;
      this.flowCanvasPanX.set(index, (this.flowCanvasPanX.get(index) || 0) + dx);
      this.flowCanvasPanY.set(index, (this.flowCanvasPanY.get(index) || 0) + dy);
      this.applyFlowCanvasTransform(index);
    };
    const onUp = () => {
      this.flowCanvasDrag = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Node drag start (reposition node within canvas)
  flowCanvasNodeDown(event: MouseEvent, todoId: string, flowIndex: number) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.flow-node-handle')) return;
    event.preventDefault();
    event.stopPropagation();
    const nodeEl = (event.target as HTMLElement).closest('.flow-node') as HTMLElement;
    if (!nodeEl) return;
    nodeEl.setAttribute('dragging', '');

    const svg = document.querySelector(`#flow-scene-${flowIndex} .flow-svg`);
    // Save original positions of children once
    const childOrigins: Map<string, { l: number; t: number }> = new Map();
    const draggedTodo = this.state.todos.find(t => t.id === todoId);
    const childIds = this.state.todos.filter(t => t.parent_id === todoId).map(t => t.id);
    for (const cid of childIds) {
      const cel = document.querySelector(`.flow-node[data-todo-id="${cid}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
      if (cel) childOrigins.set(cid, { l: parseFloat(cel.style.left) || 0, t: parseFloat(cel.style.top) || 0 });
    }

    this.flowCanvasDrag = {
      type: 'node', flowIndex, sourceId: todoId,
      startX: event.clientX, startY: event.clientY,
      origLeft: parseInt(nodeEl.style.left), origTop: parseInt(nodeEl.style.top),
    };

    const onMove = (e: MouseEvent) => {
      if (!this.flowCanvasDrag || this.flowCanvasDrag.type !== 'node') return;
      const z = this.flowCanvasZoom.get(flowIndex) || 1;
      const dx = (e.clientX - this.flowCanvasDrag.startX) / z;
      const dy = (e.clientY - this.flowCanvasDrag.startY) / z;
      const nl = (this.flowCanvasDrag.origLeft || 0) + dx;
      const nt = (this.flowCanvasDrag.origTop || 0) + dy;
      nodeEl.style.left = nl + 'px';
      nodeEl.style.top = nt + 'px';

      // Move children using saved origins (not cumulative)
      for (const [cid, orig] of childOrigins) {
        const cel = document.querySelector(`.flow-node[data-todo-id="${cid}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
        if (cel) {
          cel.style.left = (orig.l + dx) + 'px';
          cel.style.top = (orig.t + dy) + 'px';
        }
      }

      // Recalculate connected edge paths
      const allEdgePaths = svg ? svg.querySelectorAll('[data-from][data-to]') : [];
      allEdgePaths.forEach((edge: Element) => {
        const fromId = edge.getAttribute('data-from');
        const toId = edge.getAttribute('data-to');
        if (!fromId || !toId) return;
        const isDep = edge.classList.contains('flow-edge-dep');
        const fromEl = document.querySelector(`.flow-node[data-todo-id="${fromId}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
        const toEl = document.querySelector(`.flow-node[data-todo-id="${toId}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
        if (!fromEl || !toEl) return;
        const fx = parseFloat(fromEl.style.left) || 0;
        const fy = parseFloat(fromEl.style.top) || 0;
        const tx = parseFloat(toEl.style.left) || 0;
        const ty = parseFloat(toEl.style.top) || 0;
        if (isDep) {
          edge.setAttribute('d', bezierD(fx + NODE_W, fy + NODE_H / 2, tx, ty + NODE_H / 2));
        } else {
          // Parent-child edge: vertical curve from parent center-bottom to child center-top
          edge.setAttribute('d', `M${fx + NODE_W / 2} ${fy + NODE_H} C${fx + NODE_W / 2} ${(fy + NODE_H + ty) / 2} ${tx + 90} ${(fy + NODE_H + ty) / 2} ${tx + 90} ${ty}`);
        }
      });
    };

    const onUp = () => {
      nodeEl.removeAttribute('dragging');
      // Save positions for dragged node and its children
      this.flowNodePositions.set(todoId, {
        x: parseInt(nodeEl.style.left) || 0,
        y: parseInt(nodeEl.style.top) || 0,
      });
      const childIds = this.state.todos.filter(t => t.parent_id === todoId).map(t => t.id);
      for (const cid of childIds) {
        const cel = document.querySelector(`.flow-node[data-todo-id="${cid}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
        if (cel) this.flowNodePositions.set(cid, { x: parseInt(cel.style.left) || 0, y: parseInt(cel.style.top) || 0 });
      }
      this.flowCanvasDrag = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Edge drag: pull endpoint to reassign or delete
  // Edge drag: pull away to delete / reassign with preview animation
  flowCanvasEdgeDown(event: MouseEvent, depId: string, fromId: string, toId: string, flowIndex: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const z = this.flowCanvasZoom.get(flowIndex) || 1;
    const pathEl = event.target as SVGPathElement;
    const svg = document.querySelector(`#flow-scene-${flowIndex} .flow-svg`);
    this.flowCanvasDrag = { type: 'edge', flowIndex, sourceId: depId, startX: event.clientX, startY: event.clientY };
    let snappedId: string | null = null;
    let previewLine: SVGPathElement | null = null;

    // Helper to get node center in SVG coords
    const nodeCenter = (nid: string): { x: number; y: number } | null => {
      const el = document.querySelector(`.flow-node[data-todo-id="${nid}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
      if (!el) return null;
      return { x: parseFloat(el.style.left) + NODE_W / 2, y: parseFloat(el.style.top) + NODE_H / 2 };
    };

    const onMove = (e: MouseEvent) => {
      if (!this.flowCanvasDrag || this.flowCanvasDrag.type !== 'edge') return;
      const dx = (e.clientX - this.flowCanvasDrag.startX) / z;
      const dy = (e.clientY - this.flowCanvasDrag.startY) / z;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pathEl.classList.toggle('flow-edge-dragging', dist > 20);

      // Clean up old preview
      document.querySelectorAll('.flow-node.edge-snap').forEach(n => n.classList.remove('edge-snap'));
      if (previewLine) { previewLine.remove(); previewLine = null; }
      snappedId = null;

      if (depId && dist > 20) {
        const scene = document.getElementById(`flow-scene-${flowIndex}`);
        const sr = scene?.getBoundingClientRect();
        let best = Infinity;
        document.querySelectorAll(`.flow-node[data-flow-index="${flowIndex}"]`).forEach((n: Element) => {
          const nodeEl = n as HTMLElement;
          const nid = nodeEl.dataset.todoId;
          if (!nid || nid === fromId || nid === toId) return;
          if (!sr) return;
          const cx = (e.clientX - sr.left) / z;
          const cy = (e.clientY - sr.top) / z;
          const nx = parseFloat(nodeEl.style.left) + NODE_W / 2;
          const ny = parseFloat(nodeEl.style.top) + NODE_H / 2;
          const d = Math.hypot(cx - nx, cy - ny);
          if (d < 80 && d < best) { best = d; snappedId = nid; }
        });

        if (snappedId) {
          document.querySelector(`.flow-node[data-todo-id="${snappedId}"]`)?.classList.add('edge-snap');
          // Draw preview line from old predecessor to new successor
          const from = nodeCenter(fromId);
          const to = nodeCenter(snappedId);
          if (from && to && svg) {
            previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const x1 = from.x + NODE_W / 2, y1 = from.y;
            const x2 = to.x - NODE_W / 2, y2 = to.y;
            const d = `M${x1} ${y1} C${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}`;
            previewLine.setAttribute('d', d);
            previewLine.setAttribute('class', 'flow-edge flow-edge-preview');
            previewLine.setAttribute('fill', 'none');
            svg.appendChild(previewLine);
          }
        }
      }
    };

    const onUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.querySelectorAll('.flow-node.edge-snap').forEach(n => n.classList.remove('edge-snap'));
      if (previewLine) { previewLine.remove(); previewLine = null; }
      pathEl.classList.remove('flow-edge-dragging');

      const dx = (upEvent.clientX - this.flowCanvasDrag!.startX) / z;
      const dy = (upEvent.clientY - this.flowCanvasDrag!.startY) / z;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (depId && snappedId) {
        try {
          await removeDependency(depId);
          await addDependency(fromId, snappedId);
          this.state.dependencies = await getDependencies();
          this.flowNodePositions.clear();
          this.render();
        } catch (err) { this.showToast(this.translateError(err)); }
      } else if (depId && dist > 80) {
        try {
          await removeDependency(depId);
          this.state.dependencies = await getDependencies();
          this.flowNodePositions.clear();
          this.render();
        } catch (err) { this.showToast(this.translateError(err)); }
      } else if (!depId && dist > 80) {
        try {
          await setParent(toId, null);
          const todo = this.state.todos.find(t => t.id === toId);
          if (todo) todo.parent_id = null;
          this.render();
        } catch (err) { this.showToast(this.translateError(err)); }
      }
      this.flowCanvasDrag = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Handle drag: create edges with animated temporary line
  flowCanvasHandleDown(event: MouseEvent, todoId: string, handle: string, flowIndex: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const sourceTodo = this.state.todos.find(t => t.id === todoId);
    if (!sourceTodo) return;

    // Get source node position for temp line
    const srcNode = document.querySelector(`.flow-node[data-todo-id="${todoId}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
    if (!srcNode) return;
    const sx = parseFloat(srcNode.style.left) + (handle === 'right' ? NODE_W : handle === 'left' ? 0 : NODE_W / 2);
    const sy = parseFloat(srcNode.style.top) + (handle === 'bottom' ? NODE_H : NODE_H / 2);

    // Create temporary line
    const svg = document.querySelector(`#flow-scene-${flowIndex} .flow-svg`);
    let tmpLine: SVGLineElement | null = null;
    if (svg) {
      tmpLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tmpLine.setAttribute('x1', String(sx));
      tmpLine.setAttribute('y1', String(sy));
      tmpLine.setAttribute('x2', String(sx));
      tmpLine.setAttribute('y2', String(sy));
      tmpLine.setAttribute('class', 'flow-edge flow-edge-temp');
      svg.appendChild(tmpLine);
    }

    this.flowCanvasDrag = { type: 'handle', flowIndex, sourceId: todoId, handle, startX: event.clientX, startY: event.clientY };
    const onMove = (e: MouseEvent) => {
      if (!this.flowCanvasDrag || this.flowCanvasDrag.type !== 'handle') return;
      document.querySelectorAll('.flow-node.drag-target').forEach(n => n.classList.remove('drag-target'));
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetNode = el?.closest('.flow-node') as HTMLElement;
      if (!targetNode || targetNode.dataset.todoId === todoId) {
        // Still update temp line
        if (tmpLine) {
          const rect = svg?.getBoundingClientRect();
          const z = this.flowCanvasZoom.get(flowIndex) || 1;
          if (rect) { tmpLine.setAttribute('x2', String((e.clientX - rect.left) / z)); tmpLine.setAttribute('y2', String((e.clientY - rect.top) / z)); }
        }
        return;
      }
      if (handle === 'bottom') {
        // Target must not be a subtask already, and source is the parent
        const tt = this.state.todos.find(t => t.id === targetNode.dataset.todoId);
        if (tt?.parent_id || this.state.todos.some(t => t.parent_id === targetNode.dataset.todoId)) return;
      }
      targetNode.classList.add('drag-target');
      // Update temp line to target
      if (tmpLine) {
        const tx = parseFloat(targetNode.style.left) + (handle === 'right' ? 0 : handle === 'left' ? NODE_W : NODE_W / 2);
        const ty = parseFloat(targetNode.style.top) + NODE_H / 2;
        tmpLine.setAttribute('x2', String(tx));
        tmpLine.setAttribute('y2', String(ty));
      }
    };

    const onUp = async (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.querySelectorAll('.flow-node.drag-target').forEach(n => n.classList.remove('drag-target'));
      if (tmpLine) { tmpLine.remove(); tmpLine = null; }
      if (!this.flowCanvasDrag || this.flowCanvasDrag.type !== 'handle') { this.flowCanvasDrag = null; return; }
      const sourceId = this.flowCanvasDrag.sourceId;
      const h = this.flowCanvasDrag.handle;
      this.flowCanvasDrag = null;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetNode = el?.closest('.flow-node') as HTMLElement;
      if (!targetNode || !sourceId) return;
      const targetId = targetNode.dataset.todoId;
      if (!targetId || targetId === sourceId) return;
      const targetTodo = this.state.todos.find(t => t.id === targetId);

      try {
        if (h === 'right' || h === 'left') {
          if (sourceTodo.parent_id) { await setParent(sourceId, null); sourceTodo.parent_id = null; }
          if (targetTodo?.parent_id) { await setParent(targetId, null); targetTodo.parent_id = null; }
          if (h === 'right') await addDependency(sourceId, targetId);
          else await addDependency(targetId, sourceId);
        } else if (h === 'bottom') {
          // Dragging bottom handle: target becomes child of source
          const hasDeps = this.state.dependencies.some(d => d.predecessor_id === targetId || d.successor_id === targetId);
          if (hasDeps) { this.showToast(t('hasDepsNoSubtask')); return; }
          if (sourceTodo.parent_id) { this.showToast(t('noGrandchild')); return; }
          const targetHasChildren = this.state.todos.some(t => t.parent_id === targetId);
          if (targetHasChildren) { this.showToast(t('hasChildrenNoSubtask')); return; }
          await setParent(targetId, sourceId);
          if (targetTodo) targetTodo.parent_id = sourceId;
        }
        this.state.dependencies = await getDependencies();
        this.render();
      } catch (err) { this.showToast(this.translateError(err)); }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Double-click parent edge to remove subtask relationship
  async flowCanvasParentEdgeDblClick(childId: string) {
    try {
      await setParent(childId, null);
      const todo = this.state.todos.find(t => t.id === childId);
      if (todo) todo.parent_id = null;
      this.render();
      this.showToast(t('subtaskRemoved'));
    } catch (err) { this.showToast(this.translateError(err)); }
  }

  // Double-click edge to delete
  async flowCanvasEdgeDblClick(depId: string) {
    if (!depId) return;
    try {
      await removeDependency(depId);
      this.state.dependencies = await getDependencies();
      this.render();
      this.showToast(t('depDeleted'));
    } catch (err) {
      this.showToast(String(err));
    }
  }

  // Right-click node → context menu
  flowCanvasNodeContext(event: MouseEvent, todoId: string, flowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const menuItems = [
      { label: '编辑', action: `window.todoApp.editTodo('${todoId}')` },
      { label: '删除待办', action: `window.todoApp.confirmDelete('${todoId}')` },
      { label: '从流程中移除', action: `window.todoApp.removeFromFlow('${todoId}')` },
    ];
    this.showFlowContextMenu(event.clientX, event.clientY, menuItems);
  }

  // Remove todo from flow: clear all its dependencies + parent
  async removeFromFlow(todoId: string) {
    try {
      // Remove all deps involving this todo
      const deps = this.state.dependencies.filter(
        d => d.predecessor_id === todoId || d.successor_id === todoId
      );
      for (const d of deps) await removeDependency(d.id);
      // Clear parent
      await setParent(todoId, null);
      const todo = this.state.todos.find(t => t.id === todoId);
      if (todo) todo.parent_id = null;
      this.state.dependencies = await getDependencies();
      this.render();
      this.showToast(t('removedFromFlow'));
    } catch (err) {
      this.showToast(String(err));
    }
  }

  // Clear all dependencies (with confirmation via existing confirm modal)
  clearAllDependencies() {
    this.state.isConfirmOpen = true;
    this.state.confirmType = 'clearDeps';
    this.state.confirmTargetId = null;
    this.render();
  }

  async executeClearDependencies() {
    try {
      for (const d of this.state.dependencies) {
        await removeDependency(d.id);
      }
      this.state.dependencies = [];
      this.render();
      this.showToast(t('allDepsCleared'));
    } catch (err) {
      this.showToast(String(err));
    }
  }

  // Simple context menu for canvas
  private showFlowContextMenu(x: number, y: number, items: { label: string; action: string }[]) {
    const existing = document.getElementById('flow-context-menu');
    if (existing) existing.remove();
    const menu = document.createElement('div');
    menu.id = 'flow-context-menu';
    menu.className = 'flow-context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.innerHTML = items.map(i =>
      `<div class="flow-context-item" onclick="(${i.action});document.getElementById('flow-context-menu')?.remove()">${i.label}</div>`
    ).join('');
    document.body.appendChild(menu);
    const close = (e: Event) => {
      if (!menu.contains(e.target as Node)) { menu.remove(); document.removeEventListener('click', close); }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  private matchesFilters(todo: Todo): boolean {
    const { filterStatus, filterCategory, searchQuery } = this.state;
    if (filterStatus !== 'all' && todo.status !== filterStatus) return false;
    if (filterCategory !== null) {
      if (filterCategory === 'daily' && !todo.is_daily) return false;
      if (filterCategory !== 'daily' && todo.category_id !== filterCategory) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!todo.name.toLowerCase().includes(q) && !todo.notes.toLowerCase().includes(q)) return false;
    }
    return true;
  }

  // Form dependency helpers
  async removeDependencyAndRefresh(depId: string) {
    if (!depId) return;
    try {
      await removeDependency(depId);
      this.state.dependencies = await getDependencies();
      this.render();
    } catch (err) {
      console.error('Failed to remove dependency:', err);
    }
  }

  async addPredecessorFromForm(todoId: string) {
    const select = document.getElementById('add-predecessor-select') as HTMLSelectElement;
    if (!select || !select.value) return;
    try {
      await addDependency(select.value, todoId);
      this.state.dependencies = await getDependencies();
      this.render();
    } catch (err) {
      this.showToast(String(err));
    }
  }

  async clearParentAndRefresh(todoId: string) {
    try {
      await setParent(todoId, null);
      const todo = this.state.todos.find(t => t.id === todoId);
      if (todo) todo.parent_id = null;
      this.render();
    } catch (err) {
      console.error('Failed to clear parent:', err);
    }
  }

  private getFlows(): { roots: Todo[]; todos: Todo[] }[] {
    // Build adjacency for connected components (undirected: dependencies + parent-child)
    const adj = new Map<string, Set<string>>();
    const ensure = (id: string) => {
      if (!adj.has(id)) adj.set(id, new Set());
      return adj.get(id)!;
    };

    for (const dep of this.state.dependencies) {
      ensure(dep.predecessor_id).add(dep.successor_id);
      ensure(dep.successor_id).add(dep.predecessor_id);
    }
    for (const t of this.state.todos) {
      if (t.parent_id) {
        ensure(t.id).add(t.parent_id);
        ensure(t.parent_id).add(t.id);
      }
    }

    const visited = new Set<string>();
    const flows: { roots: Todo[]; todos: Todo[] }[] = [];

    // Sort todo ids for consistent order
    const sortedTodos = [...this.state.todos].sort((a, b) => a.position - b.position);

    for (const t of sortedTodos) {
      if (visited.has(t.id)) continue;
      if (!adj.has(t.id)) continue; // isolated todo = no flow

      const component: string[] = [];
      const queue = [t.id];
      visited.add(t.id);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        component.push(cur);
        for (const nb of adj.get(cur) || []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }

      const flowTodos = component
        .map(id => this.state.todos.find(td => td.id === id)!)
        .filter(Boolean);
      const roots = flowTodos.filter(td => !td.parent_id && !this.state.dependencies.some(d => d.successor_id === td.id));
      const ordered: Todo[] = [];
      const visitedInner = new Set<string>();
      const visit = (todo: Todo) => {
        if (visitedInner.has(todo.id)) return;
        visitedInner.add(todo.id);
        ordered.push(todo);
        const children = flowTodos
          .filter(c => c.parent_id === todo.id)
          .sort((a, b) => a.position - b.position);
        for (const child of children) visit(child);
        const successors = flowTodos
          .filter(c => this.state.dependencies.some(d => d.predecessor_id === todo.id && d.successor_id === c.id))
          .sort((a, b) => a.position - b.position);
        for (const s of successors) visit(s);
      };
      for (const root of roots.sort((a, b) => a.position - b.position)) visit(root);

      flows.push({ roots, todos: ordered });
    }

    return flows;
  }

  private getFlowOrderedTodos(): Todo[] {
    const rootTodos = this.state.todos.filter(t => !t.parent_id);
    const ordered: Todo[] = [];
    const visit = (todo: Todo) => {
      ordered.push(todo);
      const children = this.state.todos
        .filter(t => t.parent_id === todo.id)
        .sort((a, b) => a.position - b.position);
      for (const child of children) {
        visit(child);
      }
    };
    rootTodos.sort((a, b) => a.position - b.position);
    for (const root of rootTodos) {
      visit(root);
    }
    return ordered;
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
        todo.priority, todo.is_daily, todo.parent_id
      );
      this.state.todos = await getTodos();
      this.render();
    } catch (err) {
      console.error('Failed to update todo status:', err);
    }

    this.clearDragState();
  }

  // Flow node drag (for category/status drop)
  flowNodeDragStart(event: MouseEvent, todoId: string, flowIndex: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const nodeEl = document.querySelector(`.flow-node[data-todo-id="${todoId}"][data-flow-index="${flowIndex}"]`) as HTMLElement;
    if (!nodeEl) return;

    // Check if already outside canvas
    const canvasContainer = nodeEl.closest('.flow-canvas-container') as HTMLElement;
    const rect = canvasContainer?.getBoundingClientRect();
    if (rect && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) {
      this.flowNodeDragOutOfCanvas(event, todoId);
      return;
    }

    // Start drag: show ghost + status panel
    this.state.draggingTodoId = todoId;
    this.dragGhost = nodeEl.cloneNode(true) as HTMLElement;
    this.dragGhost.style.position = 'fixed';
    this.dragGhost.style.pointerEvents = 'none';
    this.dragGhost.style.opacity = '0.85';
    this.dragGhost.style.zIndex = '9999';
    this.dragGhost.style.width = (nodeEl.offsetWidth * 0.6) + 'px';
    this.dragGhost.style.left = event.clientX - (nodeEl.offsetWidth * 0.3) + 'px';
    this.dragGhost.style.top = event.clientY - 10 + 'px';
    this.dragGhost.style.transform = 'rotate(3deg)';
    this.dragGhost.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)';
    this.dragGhost.style.borderRadius = '8px';
    document.body.appendChild(this.dragGhost);

    // Show status panel
    const statusPanel = document.querySelector('.drag-status-panel') as HTMLElement;
    if (statusPanel) statusPanel.classList.add('active');

    document.addEventListener('mousemove', this.flowNodeDragMove);
    document.addEventListener('mouseup', this.flowNodeDragUp);
  }

  flowNodeDragMove = (event: MouseEvent) => {
    if (!this.dragGhost || !this.state.draggingTodoId) return;

    this.dragGhost.style.left = event.clientX - 50 + 'px';
    this.dragGhost.style.top = event.clientY - 10 + 'px';

    // Check category
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
    document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('drag-over'));
    const categoryItem = dropTarget?.closest('.category-item');
    if (categoryItem) categoryItem.classList.add('drag-over');

    // Check status panel
    document.querySelectorAll('.drag-status-item').forEach(el => el.classList.remove('drag-over'));
    const statusItem = dropTarget?.closest('.drag-status-item');
    if (statusItem) statusItem.classList.add('drag-over');
  };

  flowNodeDragUp = async (event: MouseEvent) => {
    document.removeEventListener('mousemove', this.flowNodeDragMove);
    document.removeEventListener('mouseup', this.flowNodeDragUp);

    const todoId = this.state.draggingTodoId;
    if (!todoId) return;

    // Remove ghost
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    // Clear highlights
    document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('drag-over'));
    document.querySelectorAll('.drag-status-item').forEach(el => el.classList.remove('drag-over'));

    // Find drop target first
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
    const todo = this.state.todos.find(t => t.id === todoId);
    if (!todo) { this.clearDragState(); return; }

    // Check if dropped on a category item (works even inside canvas)
    const categoryItem = dropTarget?.closest('.category-item');
    if (categoryItem) {
      const categoryId = categoryItem.getAttribute('data-category-id');
      if (categoryId && categoryId !== 'daily') {
        try {
          await updateTodo(
            todo.id, todo.name, todo.due_date, todo.due_date_display, todo.status,
            todo.notes, todo.quick_launch, todo.reminders, categoryId === 'all' ? null : categoryId,
            todo.priority, todo.is_daily, todo.parent_id
          );
          this.state.todos = await getTodos();
          this.render();
        } catch (err) { console.error('Failed to update category:', err); }
      }
      this.clearDragState();
      return;
    }

    // Check if dropped on a status item (works even inside canvas)
    const statusItem = dropTarget?.closest('.drag-status-item');
    if (statusItem) {
      const status = statusItem.getAttribute('data-status');
      if (status) {
        try {
          await updateTodo(
            todo.id, todo.name, todo.due_date, todo.due_date_display, status,
            todo.notes, todo.quick_launch, todo.reminders, todo.category_id,
            todo.priority, todo.is_daily, todo.parent_id
          );
          this.state.todos = await getTodos();
          this.render();
        } catch (err) { console.error('Failed to update status:', err); }
      }
      this.clearDragState();
      return;
    }

    // No valid drop target found - check if we should reposition node inside canvas
    const nodeEl = document.querySelector(`.flow-node[data-todo-id="${todoId}"]`);
    const canvasContainer = nodeEl?.closest('.flow-canvas-container') as HTMLElement;
    const rect = canvasContainer?.getBoundingClientRect();
    const isOutOfCanvas = !rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;

    if (!isOutOfCanvas) {
      this.clearDragState();
      return;
    }

    // Out of canvas and no valid drop target - just clear state
    this.clearDragState();
  };

  private flowNodeDragOutOfCanvas(event: MouseEvent, todoId: string) {
    // Handle drop directly if mouse starts outside canvas
    const todo = this.state.todos.find(t => t.id === todoId);
    if (!todo) return;
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);

    // Category
    const categoryItem = dropTarget?.closest('.category-item');
    if (categoryItem) {
      const categoryId = categoryItem.getAttribute('data-category-id');
      if (categoryId && categoryId !== 'daily') {
        updateTodo(todo.id, todo.name, todo.due_date, todo.due_date_display, todo.status, todo.notes, todo.quick_launch, todo.reminders, categoryId === 'all' ? null : categoryId, todo.priority, todo.is_daily, todo.parent_id);
        this.state.todos = this.state.todos.map(t => t.id === todoId ? { ...t, category_id: categoryId === 'all' ? null : categoryId } : t);
        this.render();
      }
      return;
    }

    // Status
    const statusItem = dropTarget?.closest('.drag-status-item');
    if (statusItem) {
      const status = statusItem.getAttribute('data-status');
      if (status) {
        updateTodo(todo.id, todo.name, todo.due_date, todo.due_date_display, status, todo.notes, todo.quick_launch, todo.reminders, todo.category_id, todo.priority, todo.is_daily, todo.parent_id);
        this.state.todos = this.state.todos.map(t => t.id === todoId ? { ...t, status: status as Todo['status'] } : t);
        this.render();
      }
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