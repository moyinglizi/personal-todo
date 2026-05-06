# Personal Todo - 技术文档

## 项目概述

Personal Todo 是一款基于 Tauri v2 的轻量级待办事项管理应用，支持全局快捷键、系统托盘、通知提醒、流程/流水线等功能。

## 技术架构

### 技术栈
- **前端**: Vanilla TypeScript + Vite
- **后端**: Tauri v2 (Rust)
- **数据库**: SQLite (rusqlite)
- **构建目标**: Windows x64

### 目录结构

```
personal-todo/
├── src/                          # 前端源码
│   ├── index.html
│   ├── app.ts                    # 应用主逻辑 (TodoApp 类)
│   ├── types.ts                  # TypeScript 类型定义
│   ├── components/               # UI 组件
│   │   ├── TodoItem.ts           # 待办项组件
│   │   ├── TodoForm.ts           # 待办表单 (含依赖编辑器)
│   │   ├── QuickInput.ts         # 快速添加弹窗
│   │   ├── CategoryPanel.ts      # 分类侧边栏
│   │   ├── CategoryManager.ts    # 分类管理 + 设置弹窗
│   │   ├── ContextMenu.ts        # 右键菜单
│   │   ├── SearchBar.ts          # 搜索栏
│   │   ├── FilterBar.ts          # 筛选栏
│   │   ├── FlowCanvas.ts         # 流程图布局 + SVG 渲染
│   │   └── ConfirmModal.ts       # 确认弹窗
│   ├── services/                 # 服务层
│   │   ├── storage.ts            # 数据持久化 (Tauri invoke)
│   │   ├── parser.ts             # 日期解析服务
│   │   ├── reminder.ts           # 提醒服务
│   │   ├── dailyReset.ts         # 每日重置服务
│   │   └── i18n.ts               # 国际化 (169 个翻译键)
│   ├── setup/
│   │   └── mocks.ts              # 测试 Mock 数据
│   └── styles/
│       └── main.css              # 全部样式 (2244 行)
├── src-tauri/                   # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Tauri 配置
│   └── src/
│       ├── main.rs              # 应用入口
│       └── lib.rs               # 库入口 + 全部命令 + 数据库初始化
└── package.json
```

## 数据模型

### Todo (待办事项)
```typescript
interface Todo {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;       // ISO 8601 格式
  due_date_display: string | null; // 原始输入，用于重新解析
  status: 'in_progress' | 'completed' | 'blocked' | 'pending';
  notes: string;
  quick_launch: string | null;
  reminders: string;             // JSON 序列化的 Reminder[]
  tags: string;
  recurring: string | null;
  position: number;
  category_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_daily: boolean;
  last_daily_reset: string | null;
  daily_time: string | null;
  parent_id: string | null;      // 子任务层级 (FK → todos.id)
}
```

### Category (分类)
```typescript
interface Category {
  id: string;
  name: string;
  color: string;       // 十六进制颜色码
  icon: string;        // Emoji 图标
  is_system: boolean;  // 系统内置 (如"每日待办")
  order: number;
  created_at: string;
}
```

### Dependency (依赖关系)
```typescript
interface Dependency {
  id: string;
  predecessor_id: string;  // 前置任务
  successor_id: string;    // 后继任务
  created_at: string;
}
```

## 核心功能

### 1. 全局快捷键
- 默认: `Ctrl+Shift+T` 唤起应用
- 可在设置中修改

### 2. 灵活日期解析
| 输入格式 | 解析结果 |
|---------|---------|
| `3 days` | 当前时间 + 3 天 |
| `-2 days` | 2 天前 (逾期) |
| `tomorrow` | 明天同一时间 |
| `friday` | 下个周五 |
| `0417 8:00` | 今年 4 月 17 日 8:00 |
| `2026-04-20` | 2026 年 4 月 20 日 |

### 3. 每日待办
- 创建时标记 `is_daily: true`
- 跨天自动重置状态为 `pending`
- 支持手动"重置所有每日待办"

### 4. 分类管理
- 用户可创建自定义分类 (名称、颜色、图标)
- 系统内置"每日待办"分类 (不可删除)
- 删除分类时，待办事项移至"无分类"
- 分类计数模式可配置（总数/未完成/已完成）

### 5. 拖拽系统
- 自定义鼠标事件拖拽（非 HTML5 Drag API，兼容 Tauri WebView）
- **列表视图**：拖拽重排序、拖到垃圾桶删除、拖到分类侧边栏换分类、拖到状态面板改状态
- **流程视图**：拖拽节点改变位置（连线跟随动画）、拖拽连接手柄创建关系、拖拽连线删除/重连

### 6. 快速启动
- 支持 URL、文件、路径三种类型，自动检测
- 单击打开 / 右键菜单 / Ctrl+单击强制打开

### 7. 主题切换
- 浅色/深色主题，CSS 变量驱动
- 设置中手动切换

### 8. 键盘快捷键
- 全部快捷键可在设置中自定义
- 默认：`n` 快速添加、`/` 搜索、`j/k` 导航、`Enter` 保存、`Esc` 关闭

### 9. 流程 / 流水线
- **前置/后继依赖**：通过流程图画布中的连接手柄拖拽创建（A 完成后 B 才能开始）
- **子任务分解**：通过底部手柄拖拽创建父子关系
- **流程视图**：列表/流程切换按钮
  - **全部待办**（`filterCategory === null`）：只读画布，显示全部关系，🔒 徽章提示
  - **具体分类**：可编辑画布 — 拖拽节点、连线、手柄编辑流程
- **连线操作**：双击删除、拖拽一段距离后松手删除、拖到另一节点松手重连
- **贝塞尔曲线**：依赖边用三次贝塞尔曲线（带箭头），父子边用虚线曲线
- **28px 命中区**：透明宽路径 + `pointer-events="stroke"` 实现轻松点击
- **阻塞规则**：前置未完成 → 不能开始；子任务未完成 → 不能完成父任务
- **自动提升**：给子任务添加依赖关系时自动清除其 parent_id
- **清除全部依赖**：流程视图标题栏按钮，带确认弹窗
- **缩放/平移**：滚轮缩放、拖拽空白平移、↺ 重置按钮

## 数据库 Schema

```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  due_date TEXT,
  due_date_display TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  quick_launch TEXT DEFAULT '[]',
  reminders TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  recurring TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  category_id TEXT REFERENCES categories(id),
  priority TEXT DEFAULT 'medium',
  is_daily INTEGER DEFAULT 0,
  last_daily_reset TEXT,
  daily_time TEXT,
  parent_id TEXT              -- FK → todos.id (子任务层级)
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#808080',
  icon TEXT DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE todo_dependencies (
  id TEXT PRIMARY KEY,
  predecessor_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  successor_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
```

## 构建与发布

```bash
# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build

# 输出位置
# MSI: src-tauri/target/release/bundle/msi/
# NSIS: src-tauri/target/release/bundle/nsis/
```
