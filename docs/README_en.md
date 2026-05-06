# Personal Todo - Technical Documentation

## Project Overview

Personal Todo is a lightweight todo management application built with Tauri v2, featuring global hotkeys, system tray, and notification reminders.

## Architecture

### Tech Stack
- **Frontend**: Vanilla TypeScript + Vite
- **Backend**: Tauri v2 (Rust)
- **Database**: SQLite
- **Build Target**: Windows x64

### Directory Structure

```
personal-todo/
├── src/                          # Frontend source
│   ├── index.html
│   ├── app.ts                    # Main application logic
│   ├── types.ts                  # TypeScript type definitions
│   ├── components/               # UI components
│   │   ├── TodoItem.ts           # Todo item component
│   │   ├── TodoForm.ts           # Todo form (with dependency editor)
│   │   ├── QuickInput.ts         # Quick add modal
│   │   ├── CategoryPanel.ts      # Category sidebar
│   │   ├── CategoryManager.ts    # Category manager + settings modal
│   │   ├── ContextMenu.ts        # Context menu
│   │   ├── SearchBar.ts          # Search bar
│   │   ├── FilterBar.ts          # Filter bar
│   │   ├── FlowCanvas.ts         # Flow chart layout + SVG rendering
│   │   └── ConfirmModal.ts       # Confirmation dialog
│   ├── services/                 # Services
│   │   ├── storage.ts            # Data persistence (Tauri invoke)
│   │   ├── parser.ts             # Date parsing service
│   │   ├── reminder.ts           # Reminder service
│   │   ├── dailyReset.ts         # Daily reset service
│   │   └── i18n.ts               # Internationalization
│   └── styles/
│       └── main.css              # Main styles
├── src-tauri/                   # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Tauri configuration
│   └── src/
│       ├── main.rs              # Application entry
│       └── lib.rs               # Library entry + commands
└── package.json
```

## Data Models

### Todo
```typescript
interface Todo {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;       // ISO 8601 format
  due_date_display: string | null; // Original input for re-parsing
  status: 'in_progress' | 'completed' | 'blocked' | 'pending';
  notes: string;
  quick_launch: string;          // JSON serialized QuickLaunchItem[]
  reminders: string;             // JSON serialized Reminder[]
  tags: string[];
  recurring: string | null;
  position: number;
  category_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_daily: boolean;
  last_daily_reset: string | null;
  daily_time: string | null;
}
```

### Category
```typescript
interface Category {
  id: string;
  name: string;
  color: string;       // Hex color code
  icon: string;        // Emoji icon
  is_system: boolean;  // System built-in (e.g., "Daily")
  order: number;
  created_at: string;
}
```

## Core Features

### 1. Global Hotkey
- Default: `Ctrl+Shift+T` to show/hide app
- Configurable in settings

### 2. Flexible Date Parsing
| Input Format | Result |
|-------------|--------|
| `3 days` | Current time + 3 days |
| `-2 days` | 2 days ago (overdue) |
| `tomorrow` | Tomorrow same time |
| `friday` | Next Friday |
| `0417 8:00` | April 17th 8:00 AM this year |
| `2026-04-20` | April 20, 2026 |

### 3. Daily Todos
- Mark `is_daily: true` when creating
- Auto-reset status to `pending` at midnight
- Manual "Reset All Daily Todos" available

### 4. Category Management
- Create custom categories (name, color, icon)
- System-built-in "Daily" category (cannot delete)
- When deleting a category, todos move to "No Category"

### 5. Drag & Drop
- Drag todo items to reorder
- Drag to trash area to delete

### 6. Quick Launch
- Support URL, file, path types
- Click to open / Right-click for menu / Ctrl+Click to force open

### 7. Theme Switching
- Light/Dark theme
- Follow system or manual selection

### 8. Keyboard Shortcuts
- All shortcuts configurable in Settings
- Default shortcuts:
  - `n` - Open quick add
  - `/` or `Ctrl+F` - Focus search
  - `j` / `k` - Navigate down/up
  - `Enter` - Save/Confirm
  - `Escape` - Close modal

### 9. Flow / Pipeline
- **Predecessor/Successor**: Drag connection handles in the flow canvas to create dependency edges (A must complete before B starts)
- **Subtasks**: Decompose a task into child items via the bottom handle drag
- **Flow View**: Toggle between list view and flow canvas view (button in filter bar)
  - **All Todos** (`filterCategory === null`): Read-only canvas showing all relationships
  - **Specific Category**: Editable canvas — drag nodes, edges, and handles to edit flow
- **Dependency Edge Operations**: Double-click to delete, drag away to delete, drag to another node to reassign
- **Edge Visual**: Bezier curves with arrow markers, 28px transparent hit area for easy interaction
- **Blocking Logic**: Cannot start a task until all predecessors complete; cannot complete a task until all subtasks complete
- **Auto-promotion**: Assigning a dependency to a subtask clears its parent first
- **Clear All Dependencies**: Button in flow view header with confirmation dialog
- **Zoom/Pan**: Mouse wheel zoom, drag empty space to pan, ↺ reset button

## Database Schema

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
  parent_id TEXT              -- FK to todos.id for subtask hierarchy
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
  daily_time TEXT
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
```

## Build & Release

```bash
# Development mode
npm run tauri dev

# Production build
npm run tauri build

# Output location
# MSI: src-tauri/target/release/bundle/msi/
# NSIS: src-tauri/target/release/bundle/nsis/
```
