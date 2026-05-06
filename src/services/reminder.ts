import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import type { Todo, Reminder } from '../types';

class ReminderScheduler {
  private timers: Map<string, Map<string, number>> = new Map();

  async init(): Promise<boolean> {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    return granted;
  }

  schedule(todo: Todo): void {
    // Cancel existing timers for this todo
    this.cancel(todo.id);

    // Handle daily todos with daily_time and reminders enabled
    if (todo.is_daily && todo.daily_time) {
      let reminders: Reminder[] = [];
      try {
        reminders = JSON.parse(todo.reminders);
      } catch {
        reminders = [];
      }
      // Only schedule if daily reminder is enabled (reminders array has value)
      if (reminders.length > 0) {
        this.scheduleDailyReminder(todo);
      }
      return;
    }

    // Handle regular todos with due_date
    if (!todo.due_date) return;

    const dueDate = new Date(todo.due_date).getTime();
    if (isNaN(dueDate)) return;

    let reminders: Reminder[] = [];
    try {
      reminders = JSON.parse(todo.reminders);
    } catch {
      reminders = [];
    }

    if (reminders.length === 0) {
      // Default reminder: at due time
      reminders = [{ id: 'default', offsetMinutes: 0, triggered: false }];
    }

    const todoTimers = new Map<string, number>();

    for (const reminder of reminders) {
      const fireAt = dueDate + (reminder.offsetMinutes * 60 * 1000);

      if (fireAt > Date.now() && !reminder.triggered) {
        const delay = fireAt - Date.now();
        const timerId = window.setTimeout(() => {
          this.triggerReminder(todo, reminder);
        }, delay);
        todoTimers.set(reminder.id, timerId);
      }
    }

    this.timers.set(todo.id, todoTimers);
  }

  private scheduleDailyReminder(todo: Todo): void {
    if (!todo.daily_time) return;

    const [hours, minutes] = todo.daily_time.split(':').map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

    // If today's time has passed, schedule for tomorrow
    let nextFire = today;
    if (today.getTime() <= now.getTime()) {
      nextFire = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }

    const delay = nextFire.getTime() - now.getTime();
    const timerId = window.setTimeout(() => {
      this.triggerDailyReminder(todo, nextFire);
    }, delay);

    const todoTimers = new Map<string, number>();
    todoTimers.set('daily', timerId);
    this.timers.set(todo.id, todoTimers);
  }

  private async triggerDailyReminder(todo: Todo, fireTime: Date): Promise<void> {
    // Reschedule for the next day
    this.scheduleDailyReminder(todo);

    let body = todo.name;
    if (todo.daily_time) {
      body += ` - Daily at ${todo.daily_time}`;
    }

    await sendNotification({
      title: 'Daily Todo Reminder',
      body
    });
  }

  cancel(todoId: string): void {
    const todoTimers = this.timers.get(todoId);
    if (todoTimers) {
      for (const timerId of todoTimers.values()) {
        window.clearTimeout(timerId);
      }
      this.timers.delete(todoId);
    }
  }

  cancelAll(): void {
    for (const todoTimers of this.timers.values()) {
      for (const timerId of todoTimers.values()) {
        window.clearTimeout(timerId);
      }
    }
    this.timers.clear();
  }

  private async triggerReminder(todo: Todo, reminder: Reminder): Promise<void> {
    const { formatDisplayDate } = await import('./parser');

    let body = todo.name;
    if (todo.due_date) {
      body += ` - Due: ${formatDisplayDate(new Date(todo.due_date))}`;
    }

    await sendNotification({
      title: 'Todo Reminder',
      body
    });
  }
}

export const reminderScheduler = new ReminderScheduler();
