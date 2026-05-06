# Personal Todo - 技术文档

## 项目概述

Personal Todo 是一款基于 Tauri v2 的轻量级待办事项管理应用，支持全局快捷键、系统托盘、通知提醒等功能。

## 技术架构

### 技术栈
- **前端**: Vanilla TypeScript + Vite
- **后端**: Tauri v2 (Rust)
- **数据库**: SQLite
- **构建目标**: Windows x64

### 目录结构

```
personal-todo/
├── src/                          # 前端源码
│   ├── index.html
│   ├── app.ts                    # 应用主逻辑
│   ├── types.ts                  # TypeScript 类型定义
│   ├── components/               # UI 组件
│   │   ├── TodoItem.ts           # 待办项组件
│   │   ├── TodoForm.ts           # 待办表单
│   │   ├── QuickInput.ts         # 快速添加弹窗
│   │   ├── CategoryPanel.ts      # 分类侧边栏
│   │   ├── CategoryManager.ts    # 分类管理弹窗
│   │   ├── ContextMenu.ts        # 右键菜单
│   │   ├── SearchBar.ts          # 搜索栏
│   │   ├── FilterBar.ts          # 筛选栏
│   │   └── LearningPlanForm.ts   # 学习计划表单
│   ├── services/                 # 服务层
│   │   ├── storage.ts            # 数据持久化 (Tauri invoke)
│   │   ├── parser.ts             # 日期解析服务
│   │   ├── reminder.ts           # 提醒服务
│   │   ├── dailyReset.ts         # 每日重置服务
│   │   └── i18n.ts               # 国际化
│   └── styles/
│       ├── main.css              # 主样式
│       ├── themes.css            # 主题色
│       └── components.css        # 组件样式
├── src-tauri/                   # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Tauri 配置
│   └── src/
│       ├── main.rs              # 应用入口
│       ├── lib.rs               # 库入口
│       ├── commands.rs          # Tauri 命令
│       ├── db.rs                # 数据库操作
│       └── tray.rs              # 系统托盘
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
  quick_launch: string;          // JSON 序列化的 QuickLaunchItem[]
  reminders: string;             // JSON 序列化的 Reminder[]
  tags: string[];
  recurring: string | null;
  position: number;
  category_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_daily: boolean;
  last_daily_reset: string | null;
}
```

### Category (分类)
```typescript
interface Category {
  id: string;
  name: string;
  color: string;       // 十六进制颜色码
  icon: string;        // Emoji 图标
  is_system: boolean;  // 系统内置 (如"每日打卡")
  order: number;
  created_at: string;
}
```

### QuickLaunchItem (快捷启动项)
```typescript
interface QuickLaunchItem {
  id: string;
  type: 'url' | 'file' | 'path';
  label: string;
  value: string;       // URL 或文件路径
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
- 每天 00:00 自动重置状态为 `pending`
- 支持手动"重置所有每日待办"

### 4. 分类管理
- 用户可创建自定义分类 (名称、颜色、图标)
- 系统内置"每日打卡"分类 (不可删除)
- 删除分类时，待办事项移至"无分类"

### 5. 拖拽排序
- 拖动待办项可调整顺序
- 拖入垃圾桶区域可删除

### 6. 快捷启动项
- 支持 URL、文件、路径三种类型
- 单击打开 / 右键菜单 / Ctrl+单击强制打开

### 7. 主题切换
- 亮色/暗色主题
- 跟随系统或手动选择

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
  last_daily_reset TEXT
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

CREATE TABLE learning_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  due_date TEXT,
  due_date_display TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  learning_progress TEXT DEFAULT '',
  category_id TEXT REFERENCES categories(id),
  priority TEXT DEFAULT 'medium',
  position INTEGER NOT NULL DEFAULT 0
);
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+T` | 全局唤起应用 |
| `n` | 打开快速添加 |
| `l` | 打开学习计划 |
| `j` / `k` | 上下导航 |
| `Enter` | 编辑选中项 |
| `Ctrl+Enter` | 保存 |
| `Esc` | 关闭弹窗 |
| `/` 或 `Ctrl+F` | 聚焦搜索 |

## i18n 翻译键

关键翻译键 (参见 `src/services/i18n.ts`):
- `priorityUrgent`, `priorityHigh`, `priorityMedium`, `priorityLow`
- `statusPending`, `statusInProgress`, `statusCompleted`, `statusBlocked`
- `dropToDelete`, `quickAddPlaceholder`, `learningPlanPlaceholder`

## 构建与发布

```bash
# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build

# 输出位置
# MSI: src-tauri/target/release/bundle/msi/Personal Todo_0.1.0_x64_en-US.msi
# NSIS: src-tauri/target/release/bundle/nsis/Personal Todo_0.1.0_x64-setup.exe
```

## 最近更新

### 2026-04-17
1. 修复中文日期显示 (周一、周二、周四 等)
2. 修复关闭按钮自动保存问题，添加手动保存按钮
3. 增强优先级显示 (标签 + 颜色指示 + 脉冲动画)
4. 修复拖拽排序功能
5. 添加 Ctrl+单击 / 中键打开快捷启动项
6. 完成 i18n 国际化 (优先级、状态等)

## 已知问题

- [ ] 窗口关闭按钮默认隐藏到托盘，而非退出应用
- [ ] 拖拽时垃圾桶区域样式优化
