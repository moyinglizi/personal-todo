# Personal Todo

A lightweight personal todo application built with Tauri v2 + Vanilla TypeScript + SQLite.

## Features

- **Quick Add**: Press `n` to quickly add a todo
- **Categories**: Organize todos with custom categories
- **Flow / Pipeline**: Predecessor/successor dependencies and subtask decomposition with visual flow canvas
- **Daily Todos**: Auto-resetting daily tasks
- **Priority & Status**: Visual priority levels and status tracking
- **Quick Launch**: Open URLs, folders, or executables directly from todos
- **Reminders**: Get notified when todos are due
- **Global Hotkey**: `Ctrl+Shift+T` to show/hide window from anywhere
- **System Tray**: Runs quietly in the background
- **Dark/Light Theme**: Switch between themes
- **i18n**: Full English and Chinese (中文) support

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build

# Run tests
npm run test:run
```

## Tech Stack

- **Frontend**: Vanilla TypeScript, HTML, CSS
- **Backend**: Tauri v2 (Rust)
- **Database**: SQLite (rusqlite)
- **Testing**: Vitest + happy-dom

## Documentation

- [English Technical Docs](docs/README_en.md)
- [中文技术文档](docs/README.md)
