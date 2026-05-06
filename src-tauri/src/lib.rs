use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, State,
};
use uuid::Uuid;
use chrono::Utc;

// Database state
pub struct DbState(pub Mutex<Option<rusqlite::Connection>>);

// Data models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub due_date: Option<String>,
    pub due_date_display: Option<String>,
    pub status: String,
    pub notes: String,
    pub quick_launch: String,
    pub reminders: String,
    pub tags: String,
    pub recurring: Option<String>,
    pub position: i32,
    pub category_id: Option<String>,
    pub priority: String,
    pub is_daily: bool,
    pub last_daily_reset: Option<String>,
    pub daily_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub is_system: bool,
    pub order: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub hotkey: String,
    pub theme: String,
    pub language: String,
    pub auto_start: bool,
    pub category_count_mode: String,
    pub shortcuts: String, // JSON string for shortcuts
}

fn init_database(conn: &rusqlite::Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
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
            category_id TEXT,
            priority TEXT DEFAULT 'medium',
            is_daily INTEGER DEFAULT 0,
            last_daily_reset TEXT,
            daily_time TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#808080',
            icon TEXT DEFAULT '',
            is_system INTEGER NOT NULL DEFAULT 0,
            'order' INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Create default "Daily" category if not exists
    let daily_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM categories WHERE id = 'daily'",
        [],
        |row| row.get(0),
    )?;

    if daily_count == 0 {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO categories (id, name, color, icon, is_system, 'order', created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params!["daily", "每日待办", "#FF6B6B", "🔄", 1, 0, now],
        )?;
    }

    // Insert default settings if not exists
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('hotkey', 'Ctrl+Shift+T')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'zh')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_start', 'false')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('category_count_mode', 'uncompleted')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('shortcuts', '{\"openQuickAdd\":\"n\",\"focusSearch\":\"/\",\"navigateDown\":\"j\",\"navigateUp\":\"k\",\"save\":\"Enter\",\"close\":\"Escape\"}')",
        [],
    )?;

    Ok(())
}

// Tauri commands
#[tauri::command]
fn get_todos(db: State<DbState>) -> Result<Vec<Todo>, String> {
    eprintln!("DEBUG get_todos called");
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    eprintln!("DEBUG: preparing statement");
    let mut stmt = conn
        .prepare("SELECT * FROM todos ORDER BY position ASC")
        .map_err(|e| {
            eprintln!("DEBUG prepare error: {}", e);
            e.to_string()
        })?;

    eprintln!("DEBUG: executing query");
    let query_result = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                due_date: row.get(4)?,
                due_date_display: row.get(5)?,
                status: row.get(6)?,
                notes: row.get::<_, Option<String>>(7)?.unwrap_or_default(),
                quick_launch: row.get::<_, Option<String>>(8)?.unwrap_or_else(|| "[]".to_string()),
                reminders: row.get::<_, Option<String>>(9)?.unwrap_or_else(|| "[]".to_string()),
                tags: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "[]".to_string()),
                recurring: row.get(11)?,
                position: row.get(12)?,
                category_id: row.get(13)?,
                priority: row.get(14)?,
                is_daily: row.get::<_, i32>(15)? == 1,
                last_daily_reset: row.get(16)?,
                daily_time: row.get(17)?,
            })
        })
        .map_err(|e| {
            eprintln!("DEBUG query_map error: {}", e);
            e.to_string()
        })?;

    eprintln!("DEBUG: collecting results");
    let result: Vec<Todo> = query_result.collect::<Result<Vec<_>, _>>().map_err(|e| {
        eprintln!("DEBUG collect error: {}", e);
        e.to_string()
    })?;

    eprintln!("DEBUG get_todos returning {} todos", result.len());
    Ok(result)
}

#[tauri::command]
fn create_todo(
    db: State<DbState>,
    name: String,
    due_date: Option<String>,
    due_date_display: Option<String>,
    category_id: Option<String>,
    priority: String,
    is_daily: bool,
    status: String,
    daily_time: Option<String>,
) -> Result<Todo, String> {
    eprintln!("DEBUG create_todo called: name={}, is_daily={}", name, is_daily);
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let max_pos: i32 = conn
        .query_row("SELECT COALESCE(MAX(position), 0) FROM todos", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO todos (id, name, created_at, updated_at, due_date, due_date_display, status, notes, quick_launch, reminders, tags, category_id, priority, is_daily, position, daily_time)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        rusqlite::params![
            id,
            name,
            now,
            now,
            due_date,
            due_date_display,
            status,
            "[]",
            "[]",
            "[]",
            "[]",
            category_id,
            priority,
            is_daily as i32,
            max_pos + 1,
            daily_time
        ],
    ).map_err(|e| {
        eprintln!("DEBUG create_todo ERROR: {}", e);
        e.to_string()
    })?;
    eprintln!("DEBUG create_todo SUCCESS: inserted id={}", id);

    Ok(Todo {
        id,
        name,
        created_at: now.clone(),
        updated_at: now,
        due_date,
        due_date_display,
        status,
        notes: String::new(),
        quick_launch: "[]".to_string(),
        reminders: "[]".to_string(),
        tags: "[]".to_string(),
        recurring: None,
        position: max_pos + 1,
        category_id,
        priority,
        is_daily,
        last_daily_reset: None,
        daily_time,
    })
}

#[tauri::command]
fn update_todo(
    db: State<DbState>,
    id: String,
    name: String,
    due_date: Option<String>,
    due_date_display: Option<String>,
    status: String,
    notes: String,
    quick_launch: Option<String>,
    reminders: String,
    category_id: Option<String>,
    priority: String,
    is_daily: bool,
    daily_time: Option<String>,
) -> Result<(), String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE todos SET name=?1, updated_at=?2, due_date=?3, due_date_display=?4, status=?5, notes=?6, quick_launch=?7, reminders=?8, category_id=?9, priority=?10, is_daily=?11, daily_time=?12 WHERE id=?13",
        rusqlite::params![name, now, due_date, due_date_display, status, notes, quick_launch, reminders, category_id, priority, is_daily as i32, daily_time, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_todo(db: State<DbState>, id: String) -> Result<(), String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute("DELETE FROM todos WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_categories(db: State<DbState>) -> Result<Vec<Category>, String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare("SELECT * FROM categories ORDER BY 'order' ASC")
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                is_system: row.get::<_, i32>(4)? == 1,
                order: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    categories.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_category(
    db: State<DbState>,
    name: String,
    color: String,
    icon: String,
) -> Result<Category, String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row("SELECT COALESCE(MAX('order'), 0) FROM categories", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO categories (id, name, color, icon, is_system, 'order', created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, name, color, icon, 0, max_order + 1, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Category {
        id,
        name,
        color,
        icon,
        is_system: false,
        order: max_order + 1,
        created_at: now,
    })
}

#[tauri::command]
fn update_category(
    db: State<DbState>,
    id: String,
    name: String,
    color: String,
    icon: String,
) -> Result<(), String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE categories SET name=?1, color=?2, icon=?3 WHERE id=?4",
        rusqlite::params![name, color, icon, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_category(db: State<DbState>, id: String) -> Result<(), String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    // Move todos in this category to null
    conn.execute(
        "UPDATE todos SET category_id = NULL WHERE category_id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM categories WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn reorder_categories(db: State<DbState>, source_id: String, target_id: String) -> Result<(), String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    // Get current order values
    let source_order: i32 = conn
        .query_row("SELECT \"order\" FROM categories WHERE id=?1", rusqlite::params![source_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let target_order: i32 = conn
        .query_row("SELECT \"order\" FROM categories WHERE id=?1", rusqlite::params![target_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // Swap orders
    conn.execute(
        "UPDATE categories SET \"order\"=?1 WHERE id=?2",
        rusqlite::params![target_order, source_id],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE categories SET \"order\"=?1 WHERE id=?2",
        rusqlite::params![source_order, target_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_settings(db: State<DbState>) -> Result<Settings, String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let hotkey: String = conn
        .query_row("SELECT value FROM settings WHERE key='hotkey'", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "Ctrl+Shift+T".to_string());

    let theme: String = conn
        .query_row("SELECT value FROM settings WHERE key='theme'", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "light".to_string());

    let language: String = conn
        .query_row("SELECT value FROM settings WHERE key='language'", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "zh".to_string());

    let auto_start: String = conn
        .query_row("SELECT value FROM settings WHERE key='auto_start'", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "false".to_string());

    let category_count_mode: String = conn
        .query_row("SELECT value FROM settings WHERE key='category_count_mode'", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "uncompleted".to_string());

    let shortcuts: String = conn
        .query_row("SELECT value FROM settings WHERE key='shortcuts'", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "{\"openQuickAdd\":\"n\",\"focusSearch\":\"/\",\"navigateDown\":\"j\",\"navigateUp\":\"k\",\"save\":\"Enter\",\"close\":\"Escape\"}".to_string());

    Ok(Settings {
        hotkey,
        theme,
        language,
        auto_start: auto_start == "true",
        category_count_mode,
        shortcuts,
    })
}

#[tauri::command]
fn update_settings(db: State<DbState>, hotkey: String, theme: String, language: String, auto_start: bool, category_count_mode: String, shortcuts: String) -> Result<(), String> {
    eprintln!("DEBUG update_settings called with: hotkey={}, theme={}, language={}, auto_start={}, category_count_mode={}, shortcuts={}", hotkey, theme, language, auto_start, category_count_mode, shortcuts);
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE settings SET value=?1 WHERE key='hotkey'",
        rusqlite::params![hotkey],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE settings SET value=?1 WHERE key='theme'",
        rusqlite::params![theme],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE settings SET value=?1 WHERE key='language'",
        rusqlite::params![language],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE settings SET value=?1 WHERE key='auto_start'",
        rusqlite::params![auto_start.to_string()],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('category_count_mode', ?1)",
        rusqlite::params![category_count_mode],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('shortcuts', ?1)",
        rusqlite::params![shortcuts],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn reset_daily_todos(db: State<DbState>) -> Result<(), String> {
    let guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE todos SET status='pending', last_daily_reset=?1 WHERE is_daily=1",
        rusqlite::params![now],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn launch_url(path: String) -> Result<(), String> {
    println!("launch_url called with: {}", path);
    // Auto-detect the path type based on the value
    if path.starts_with("http://") || path.starts_with("https://") {
        // URL - open in browser
        println!("Opening as URL");
        open::that(&path).map_err(|e| e.to_string())
    } else if path.contains(':') || path.starts_with('/') || path.starts_with('\\') {
        // Windows path (C:\) or Unix path (/ or \) - try as file/folder
        // If it's a file, open will handle it; if it's a directory, it opens in explorer
        println!("Opening as path");
        open::that(&path).map_err(|e| e.to_string())
    } else {
        // Otherwise, treat as executable command
        println!("Opening as executable");
        std::process::Command::new(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
fn set_auto_start(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    eprintln!("DEBUG set_auto_start called: enabled={}", enabled);
    let autostart = app.autolaunch();

    if enabled {
        eprintln!("DEBUG: enabling autostart");
        autostart.enable().map_err(|e| {
            eprintln!("DEBUG: enable error: {}", e);
            e.to_string()
        })?;
    } else {
        eprintln!("DEBUG: disabling autostart");
        // Ignore error if already disabled (registry entry doesn't exist)
        let _ = autostart.disable();
    }

    eprintln!("DEBUG set_auto_start completed successfully");
    Ok(())
}

#[tauri::command]
fn get_auto_start(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    eprintln!("DEBUG get_auto_start called");
    let autostart = app.autolaunch();
    let result = autostart.is_enabled().map_err(|e| {
        eprintln!("DEBUG get_auto_start error: {}", e);
        e.to_string()
    });
    eprintln!("DEBUG get_auto_start result: {:?}", result);
    result
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let app_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("personal-todo");

    eprintln!("DEBUG: app_dir = {:?}", app_dir);

    std::fs::create_dir_all(&app_dir).expect("Failed to create app directory");

    let db_path = app_dir.join("todo.db");
    eprintln!("DEBUG: db_path = {:?}", db_path);
    let conn = rusqlite::Connection::open(&db_path).expect("Failed to open database");
    init_database(&conn).expect("Failed to initialize database");

    // Fix any NULL values in JSON columns
    if let Err(e) = conn.execute("UPDATE todos SET notes='[]' WHERE notes IS NULL", []) {
        eprintln!("DEBUG: failed to fix notes NULL: {}", e);
    }
    if let Err(e) = conn.execute("UPDATE todos SET quick_launch='[]' WHERE quick_launch IS NULL", []) {
        eprintln!("DEBUG: failed to fix quick_launch NULL: {}", e);
    }
    if let Err(e) = conn.execute("UPDATE todos SET reminders='[]' WHERE reminders IS NULL", []) {
        eprintln!("DEBUG: failed to fix reminders NULL: {}", e);
    }
    if let Err(e) = conn.execute("UPDATE todos SET tags='[]' WHERE tags IS NULL", []) {
        eprintln!("DEBUG: failed to fix tags NULL: {}", e);
    }
    // Add daily_time column if it doesn't exist (SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN in rusqlite)
    let has_daily_time: i32 = conn
        .query_row("SELECT COUNT(*) FROM pragma_table_info('todos') WHERE name='daily_time'", [], |row| row.get(0))
        .unwrap_or(0);
    if has_daily_time == 0 {
        if let Err(e) = conn.execute("ALTER TABLE todos ADD COLUMN daily_time TEXT", []) {
            eprintln!("DEBUG: failed to add daily_time column: {}", e);
        }
    }

    let db_state = DbState(Mutex::new(Some(conn)));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(Default::default(), None))
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            get_todos,
            create_todo,
            update_todo,
            delete_todo,
            get_categories,
            create_category,
            update_category,
            delete_category,
            reorder_categories,
            get_settings,
            update_settings,
            reset_daily_todos,
            launch_url,
            set_auto_start,
            get_auto_start,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;

            // Handle window close to hide instead of quit
            let app_handle = app.handle().clone();
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                });
            }

            // Register global shortcut
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

            let shortcut =
                Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyT);

            // Check if already registered (can happen during hot reload)
            let registered = app.global_shortcut().is_registered(shortcut.clone());
            if registered {
                let _ = app.global_shortcut().unregister(shortcut.clone());
            }

            let app_handle_shortcut = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_, _, event| {
                use tauri_plugin_global_shortcut::ShortcutState;
                if event.state() == ShortcutState::Pressed {
                    if let Some(window) = app_handle_shortcut.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                }
            })?;

            let _ = app.global_shortcut().register(shortcut);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
