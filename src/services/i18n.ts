export type Language = 'en' | 'zh';

export interface Translations {
  // App
  appName: string;

  // Navigation
  categories: string;
  allTodos: string;
  allItems: string;
  inProgress: string;
  completed: string;
  blocked: string;
  pending: string;

  // Actions
  quickAdd: string;
  newTodo: string;
  editTodo: string;
  deleteTodo: string;
  save: string;
  create: string;
  cancel: string;
  close: string;
  reset: string;
  resetAllDaily: string;
  add: string;
  escToCancel: string;
  quickAddPlaceholder: string;

  // Form
  name: string;
  nameRequired: string;
  dueDate: string;
  dueDateOptional: string;
  priority: string;
  status: string;
  category: string;
  noCategory: string;
  notes: string;
  notesPlaceholder: string;
  quickLaunch: string;
  quickLaunchPlaceholder: string;
  addShortcut: string;
  reminders: string;
  atDueTime: string;
  minutesBefore: string;
  dailyTodo: string;
  dailyTodoDesc: string;
  dailyTodos: string;
  dailyTime: string;
  dailyTimeDesc: string;
  enableDailyReminder: string;
  dailyReminderDesc: string;
  today: string;
  tomorrow: string;
  specific: string;
  selectTime: string;
  moreOptions: string;

  // Settings
  settings: string;
  globalHotkey: string;
  theme: string;
  lightTheme: string;
  darkTheme: string;
  autoStart: string;
  autoStartDesc: string;
  categoryCountMode: string;
  categoryCountModeTotal: string;
  categoryCountModeUncompleted: string;
  categoryCountModeCompleted: string;
  language: string;

  // Shortcuts
  shortcuts: string;
  shortcutOpenQuickAdd: string;
  shortcutFocusSearch: string;
  shortcutNavigateDown: string;
  shortcutNavigateUp: string;
  shortcutSave: string;
  shortcutClose: string;
  pressAnyKey: string;

  // Status
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
  statusBlocked: string;
  markPending: string;
  startTask: string;
  completeTask: string;
  blockTask: string;

  // Priority
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityUrgent: string;

  // Empty states
  noTodosYet: string;
  addFirstTodo: string;
  noResults: string;

  // Confirmations
  confirmDelete: string;
  confirmDeleteCategory: string;
  categoryDeleteWarning: string;
  delete: string;

  // Category Manager
  manageCategories: string;
  newCategory: string;
  editCategory: string;
  yourCategories: string;
  noCustomCategories: string;
  color: string;
  icon: string;

  // Context menu
  edit: string;
  setStatus: string;
  openLink: string;
  copyLink: string;

  // Misc
  todos: string;
  completedCount: string;
  daily: string;
  dueToday: string;
  dueTomorrow: string;
  overdue: string;
  parsedAs: string;
  noDueDate: string;
  searchPlaceholder: string;
  sortBy: string;
  position: string;
  createdAt: string;
  dropToDelete: string;

  // Flow / Pipeline
  flowView: string;
  listView: string;
  dependencies: string;
  predecessors: string;
  successors: string;
  subtasks: string;
  setAsPrerequisite: string;
  setAsSuccessor: string;
  makeSubtask: string;
  blockedBy: string;
  completeSubtasksFirst: string;
  none: string;
  addPredecessor: string;
  remove: string;
  parentTodo: string;
  flow: string;
  otherTodos: string;
  noFlowsYet: string;
  flowHint: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  todoItems: string;
  flowReadonly: string;
  clearAllDeps: string;
  confirmClearDeps: string;
  confirmClearDepsDesc: string;

  // Toast messages
  switchedToFlowView: string;
  switchedToListView: string;
  depDeleted: string;
  depReconnected: string;
  subtaskMoved: string;
  subtaskRemoved: string;
  removedFromFlow: string;
  allDepsCleared: string;
  hasDepsNoSubtask: string;
  noSubtaskOfSubtask: string;
  hasChildrenNoSubtask: string;
  noGrandchild: string;
  dragToCanvas: string;
  clickToToggleStatus: string;

  // Rust error translations
  circularDependency: string;
  selfDependency: string;
  dependencyExists: string;
  selfParent: string;

  // Flow help
  flowHelp: string;
  flowHelpIntro: string;
  flowHelpDep: string;
  flowHelpSubtask: string;
  flowHelpEdge: string;
  flowHelpView: string;
  flowHelpRules: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: 'Personal Todo',

    categories: 'CATEGORIES',
    allTodos: 'All Todos',
    allItems: 'All Items',
    inProgress: 'In Progress',
    completed: 'Completed',
    blocked: 'Blocked',
    pending: 'Pending',

    quickAdd: 'Quick Add',
    newTodo: 'New Todo',
    editTodo: 'Edit Todo',
    deleteTodo: 'Delete',
    save: 'Save',
    create: 'Create',
    cancel: 'Cancel',
    close: 'Close',
    reset: 'Reset',
    resetAllDaily: 'Reset All Daily Todos Now',
    add: 'Add',
    escToCancel: 'Esc to cancel',
    quickAddPlaceholder: 'Buy groceries after work',

    name: 'Name',
    nameRequired: 'Name *',
    dueDate: 'Due Date',
    dueDateOptional: 'Due date (optional)',
    priority: 'Priority',
    status: 'Status',
    category: 'Category',
    noCategory: 'No Category',
    notes: 'Notes',
    notesPlaceholder: 'Add notes, URLs, images...',
    quickLaunch: 'Quick Launch',
    quickLaunchPlaceholder: 'Enter URL, folder path, or executable path',
    addShortcut: '+ Add Shortcut',
    reminders: 'Reminders',
    atDueTime: 'At due time',
    minutesBefore: 'min before',
    dailyTodo: 'Daily Todo',
    dailyTodoDesc: '🔄 Daily Todo (auto-reset each day)',
    dailyTodos: 'Daily Todos',
    dailyTime: 'Daily Time',
    dailyTimeDesc: '⏰ Time to complete this daily task',
    enableDailyReminder: 'Enable Daily Reminder',
    dailyReminderDesc: '🔔 Receive notification at this time each day',
    today: 'Today',
    tomorrow: 'Tomorrow',
    specific: 'Specific',
    selectTime: 'Select time',
    moreOptions: 'More Options',

    settings: 'Settings',
    globalHotkey: 'Global Hotkey',
    theme: 'Theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    autoStart: 'Auto Start',
    autoStartDesc: 'Start automatically when system boots',
    categoryCountMode: 'Category Count Mode',
    categoryCountModeTotal: 'Show total count',
    categoryCountModeUncompleted: 'Show uncompleted count',
    categoryCountModeCompleted: 'Show completed count',
    language: 'Language',

    shortcuts: 'Keyboard Shortcuts',
    shortcutOpenQuickAdd: 'Open Quick Add',
    shortcutFocusSearch: 'Focus Search',
    shortcutNavigateDown: 'Navigate Down',
    shortcutNavigateUp: 'Navigate Up',
    shortcutSave: 'Save / Confirm',
    shortcutClose: 'Close Modal',
    pressAnyKey: 'Press any key...',

    statusPending: 'Pending',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    statusBlocked: 'Blocked',
    markPending: 'Mark Pending',
    startTask: 'Start Task',
    completeTask: 'Complete',
    blockTask: 'Block',

    priorityLow: '🟢 Low',
    priorityMedium: '🟡 Medium',
    priorityHigh: '🟠 High',
    priorityUrgent: '🔴 Urgent',

    noTodosYet: 'No todos yet',
    addFirstTodo: 'Add your first todo',
    noResults: 'No results found',

    confirmDelete: 'Are you sure you want to delete this todo?',
    confirmDeleteCategory: 'Delete this category?',
    categoryDeleteWarning: 'Todos will be moved to "No Category".',
    delete: 'Delete',

    manageCategories: 'Manage Categories',
    newCategory: 'New Category',
    editCategory: 'Edit Category',
    yourCategories: 'Your Categories',
    noCustomCategories: 'No custom categories yet',
    color: 'Color',
    icon: 'Icon',

    edit: 'Edit',
    setStatus: 'Set Status',
    openLink: 'Open Link',
    copyLink: 'Copy Link',

    todos: 'todos',
    completedCount: 'completed',
    daily: 'daily',
    dueToday: 'Due Today',
    dueTomorrow: 'Due Tomorrow',
    overdue: 'Overdue',
    parsedAs: 'Parsed:',
    noDueDate: 'No due date',
    searchPlaceholder: 'Search todos...',
    sortBy: 'Sort',
    position: 'Position',
    createdAt: 'Created',
    dropToDelete: 'Drop here to delete',

    // Flow / Pipeline
    flowView: 'Flow View',
    listView: 'List View',
    dependencies: 'Dependencies',
    predecessors: 'Prerequisites',
    successors: 'Dependents',
    subtasks: 'Subtasks',
    setAsPrerequisite: 'Set as prerequisite',
    setAsSuccessor: 'Set as successor',
    makeSubtask: 'Make subtask',
    blockedBy: 'Blocked by',
    completeSubtasksFirst: 'Complete all subtasks first',
    none: 'None',
    addPredecessor: 'Add prerequisite',
    remove: 'Remove',
    parentTodo: 'Parent',
    flow: 'Flow',
    otherTodos: 'Other',
    noFlowsYet: 'No flows configured yet',
    flowHint: 'Drag one todo onto another todo\'s top half to create a dependency, or onto the bottom half to make it a subtask.',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset',
    todoItems: 'Items',
    flowReadonly: 'Read-only – switch to a category to edit flow',
    clearAllDeps: 'Clear All',
    confirmClearDeps: 'Clear All Dependencies?',
    confirmClearDepsDesc: 'This will remove all predecessor/successor relationships. Todo items will not be deleted.',

    switchedToFlowView: 'Switched to Flow View',
    switchedToListView: 'Switched to List View',
    depDeleted: 'Dependency deleted',
    depReconnected: 'Dependency reconnected',
    subtaskMoved: 'Subtask relationship updated',
    subtaskRemoved: 'Subtask relationship removed',
    removedFromFlow: 'Removed from flow',
    allDepsCleared: 'All dependencies cleared',
    hasDepsNoSubtask: 'Tasks with dependencies cannot become subtasks',
    noSubtaskOfSubtask: 'Cannot create nested subtasks',
    hasChildrenNoSubtask: 'Tasks with subtasks cannot become subtasks',
    noGrandchild: 'Cannot create nested subtasks',
    dragToCanvas: 'Drag todos here',
    clickToToggleStatus: 'Click to toggle status',

    circularDependency: 'Circular dependency detected',
    selfDependency: 'A task cannot depend on itself',
    dependencyExists: 'Dependency already exists',
    selfParent: 'A task cannot be its own parent',

    flowHelp: 'Flow & Canvas Guide',
    flowHelpIntro: 'The flow system lets you organize tasks with dependencies and subtasks. Switch to Flow View to see the visual canvas.',
    flowHelpDep: 'Create a dependency by dragging the right handle of task A to task B — A must complete before B can start.',
    flowHelpSubtask: 'Create a subtask by dragging the bottom handle of task A to task B — B becomes a child of A.',
    flowHelpEdge: 'Double-click an edge to delete it. Drag an edge to another node to reassign. Drag an edge away and release to delete.',
    flowHelpView: 'All Todos view is read-only. Select a specific category to edit relationships in the canvas.',
    flowHelpRules: 'Subtasks cannot have their own dependencies. A parent cannot be completed until all subtasks are done.',
  },

  zh: {
    appName: '个人待办',

    categories: '分类',
    allTodos: '全部待办',
    allItems: '全部待办',
    inProgress: '进行中',
    completed: '已完成',
    blocked: '阻塞',
    pending: '待办',

    quickAdd: '快速添加',
    newTodo: '新建待办',
    editTodo: '编辑待办',
    deleteTodo: '删除',
    save: '保存',
    create: '创建',
    cancel: '取消',
    close: '关闭',
    reset: '重置',
    resetAllDaily: '重置所有每日待办',
    add: '添加',
    escToCancel: '按 Esc 取消',
    quickAddPlaceholder: '买完东西下班',

    name: '名称',
    nameRequired: '名称 *',
    dueDate: '截止日期',
    dueDateOptional: '截止日期（可选）',
    priority: '优先级',
    status: '状态',
    category: '分类',
    noCategory: '无分类',
    notes: '备注',
    notesPlaceholder: '添加备注、网址、图片...',
    quickLaunch: '快速启动',
    quickLaunchPlaceholder: '输入网址、文件夹路径或可执行文件路径',
    addShortcut: '+ 添加快捷方式',
    reminders: '提醒',
    atDueTime: '到期时',
    minutesBefore: '分钟前',
    dailyTodo: '每日待办',
    dailyTodoDesc: '🔄 每日待办（每天自动重置）',
    dailyTodos: '每日待办',
    dailyTime: '每日时间',
    dailyTimeDesc: '⏰ 每日待办完成时间',
    enableDailyReminder: '开启每日提醒',
    dailyReminderDesc: '🔔 每天到此时间时接收通知',
    today: '今天',
    tomorrow: '明天',
    specific: '自定义',
    selectTime: '选择时间',
    moreOptions: '更多选项',

    settings: '设置',
    globalHotkey: '全局快捷键',
    theme: '主题',
    lightTheme: '浅色',
    darkTheme: '深色',
    autoStart: '开机自启',
    autoStartDesc: '系统启动时自动运行',
    categoryCountMode: '分类数量显示',
    categoryCountModeTotal: '显示总数',
    categoryCountModeUncompleted: '显示未完成数',
    categoryCountModeCompleted: '显示已完成数',
    language: '语言',

    shortcuts: '键盘快捷键',
    shortcutOpenQuickAdd: '打开快速添加',
    shortcutFocusSearch: '聚焦搜索框',
    shortcutNavigateDown: '下移选择',
    shortcutNavigateUp: '上移选择',
    shortcutSave: '保存/确认',
    shortcutClose: '关闭弹窗',
    pressAnyKey: '按下任意键...',

    statusPending: '待处理',
    statusInProgress: '进行中',
    statusCompleted: '已完成',
    statusBlocked: '已阻塞',
    markPending: '标记为待处理',
    startTask: '开始任务',
    completeTask: '完成任务',
    blockTask: '阻塞任务',

    priorityLow: '🟢 优先级：低',
    priorityMedium: '🟡 优先级：中',
    priorityHigh: '🟠 优先级：高',
    priorityUrgent: '🔴 优先级：紧急',

    noTodosYet: '暂无待办事项',
    addFirstTodo: '添加你的第一个待办',
    noResults: '未找到结果',

    confirmDelete: '确定要删除这个待办吗？',
    confirmDeleteCategory: '删除这个分类？',
    categoryDeleteWarning: '待办将移至"无分类"。',
    delete: '删除',

    manageCategories: '管理分类',
    newCategory: '新建分类',
    editCategory: '编辑分类',
    yourCategories: '我的分类',
    noCustomCategories: '暂无自定义分类',
    color: '颜色',
    icon: '图标',

    edit: '编辑',
    setStatus: '设置状态',
    openLink: '打开链接',
    copyLink: '复制链接',

    todos: '个待办',
    completedCount: '已完成',
    daily: '每日',
    dueToday: '今日到期',
    dueTomorrow: '明日到期',
    overdue: '已逾期',
    parsedAs: '解析为：',
    noDueDate: '无截止日期',
    searchPlaceholder: '搜索待办...',
    sortBy: '排序',
    position: '位置',
    createdAt: '创建时间',
    dropToDelete: '拖放到此处删除',

    // Flow / Pipeline
    flowView: '流程视图',
    listView: '列表视图',
    dependencies: '依赖关系',
    predecessors: '前置任务',
    successors: '后继任务',
    subtasks: '子任务',
    setAsPrerequisite: '设为前置',
    setAsSuccessor: '设为后置',
    makeSubtask: '设为子任务',
    blockedBy: '被阻塞',
    completeSubtasksFirst: '请先完成所有子任务',
    none: '无',
    addPredecessor: '添加前置任务',
    remove: '移除',
    parentTodo: '父任务',
    flow: '流程',
    otherTodos: '其他',
    noFlowsYet: '暂无流程',
    flowHint: '拖拽一个待办到另一个待办的上半区域创建前置依赖，或拖到下半区域设为子任务。',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '重置',
    todoItems: '待办条目',
    flowReadonly: '全部待办为只读 – 请切换到对应分类编辑流程',
    clearAllDeps: '清除全部',
    confirmClearDeps: '确认清除所有依赖关系？',
    confirmClearDepsDesc: '这将移除全部前置/后继关系，待办事项不会被删除。',

    switchedToFlowView: '已切换到流程视图',
    switchedToListView: '已切换到列表视图',
    depDeleted: '依赖已删除',
    depReconnected: '依赖已重连',
    subtaskMoved: '子任务关系已更新',
    subtaskRemoved: '子任务关系已解除',
    removedFromFlow: '已从流程中移除',
    allDepsCleared: '所有依赖关系已清除',
    hasDepsNoSubtask: '已有依赖关系的任务不能设为子任务',
    noSubtaskOfSubtask: '不能设为子任务的子任务',
    hasChildrenNoSubtask: '已有子任务的待办不能设为子任务',
    noGrandchild: '不能创建嵌套子任务',
    dragToCanvas: '拖拽待办到此处',
    clickToToggleStatus: '点击切换状态',

    circularDependency: '检测到循环依赖',
    selfDependency: '任务不能依赖自身',
    dependencyExists: '依赖关系已存在',
    selfParent: '任务不能设为自身的子任务',

    flowHelp: '流程与画布说明',
    flowHelpIntro: '流程系统可以为任务设置前置依赖和子任务。切换到流程视图即可看到可视化画布。',
    flowHelpDep: '创建依赖：拖拽任务 A 的右侧手柄到任务 B — A 完成后 B 才能开始。',
    flowHelpSubtask: '创建子任务：拖拽任务 A 的底部手柄到任务 B — B 成为 A 的子任务。',
    flowHelpEdge: '双击连线删除。拖拽连线到另一节点可重连。拖拽连线到空白处松手可删除。',
    flowHelpView: '全部待办为只读模式，切换到具体分类后可以在画布中编辑关系。',
    flowHelpRules: '子任务不能有依赖关系。父任务在所有子任务完成前不能标记为已完成。',
  },
};

let currentLanguage: Language = 'zh';

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: keyof Translations): string {
  return translations[currentLanguage][key];
}

export function getTranslations(): Translations {
  return translations[currentLanguage];
}