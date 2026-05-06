// Flexible date parsing service

const now = new Date();

const DATE_PATTERNS: Array<{
  regex: RegExp;
  handler: (match: RegExpMatchArray, baseDate: Date) => Date;
}> = [
  // 3 days, -2 days
  {
    regex: /^([+-]?\d+)\s*days?$/i,
    handler: (m, base) => {
      const days = parseInt(m[1]);
      const result = new Date(base);
      result.setDate(result.getDate() + days);
      return result;
    }
  },
  // 2h, 3h (hours)
  {
    regex: /^(\d+)\s*h(?:ours?)?$/i,
    handler: (m, base) => {
      const hours = parseInt(m[1]);
      const result = new Date(base);
      result.setHours(result.getHours() + hours);
      return result;
    }
  },
  // 30m (minutes)
  {
    regex: /^(\d+)\s*m(?:in(?:utes)?)?$/i,
    handler: (m, base) => {
      const mins = parseInt(m[1]);
      const result = new Date(base);
      result.setMinutes(result.getMinutes() + mins);
      return result;
    }
  },
  // tomorrow
  {
    regex: /^tomorrow$/i,
    handler: (_, base) => {
      const result = new Date(base);
      result.setDate(result.getDate() + 1);
      return result;
    }
  },
  // today
  {
    regex: /^today$/i,
    handler: (_, base) => new Date(base)
  },
  // next week
  {
    regex: /^next\s*week$/i,
    handler: (_, base) => {
      const result = new Date(base);
      result.setDate(result.getDate() + 7);
      return result;
    }
  },
  // next month
  {
    regex: /^next\s*month$/i,
    handler: (_, base) => {
      const result = new Date(base);
      result.setMonth(result.getMonth() + 1);
      return result;
    }
  },
  // day names: monday, tuesday, etc.
  {
    regex: /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
    handler: (m) => {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(m[1].toLowerCase());
      const today = new Date();
      const todayDay = today.getDay();
      let daysUntil = targetDay - todayDay;
      if (daysUntil <= 0) daysUntil += 7;
      const result = new Date(today);
      result.setDate(result.getDate() + daysUntil);
      return result;
    }
  },
  // MMdd HH:mm or MMdd H:mm
  {
    regex: /^(\d{2})(\d{2})\s+(\d{1,2}):(\d{2})$/i,
    handler: (m) => {
      const month = parseInt(m[1]) - 1;
      const day = parseInt(m[2]);
      const hour = parseInt(m[3]);
      const minute = parseInt(m[4]);
      const year = new Date().getFullYear();
      return new Date(year, month, day, hour, minute);
    }
  },
  // YYYY-MM-DD or YYYY-MM-DD HH:mm
  {
    regex: /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?$/i,
    handler: (m) => {
      const year = parseInt(m[1]);
      const month = parseInt(m[2]) - 1;
      const day = parseInt(m[3]);
      const hour = m[4] ? parseInt(m[4]) : 0;
      const minute = m[5] ? parseInt(m[5]) : 0;
      return new Date(year, month, day, hour, minute);
    }
  },
  // YYYY/MM/DD
  {
    regex: /^(\d{4})\/(\d{2})\/(\d{2})$/i,
    handler: (m) => {
      const year = parseInt(m[1]);
      const month = parseInt(m[2]) - 1;
      const day = parseInt(m[3]);
      return new Date(year, month, day);
    }
  },
];

export function parseFlexibleDate(input: string): { date: Date | null; display: string } {
  if (!input || input.trim() === '') {
    return { date: null, display: '' };
  }

  const trimmed = input.trim();

  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const date = pattern.handler(match, new Date());
      return { date, display: formatDisplayDate(date) };
    }
  }

  // Try native Date parsing as fallback
  const nativeDate = new Date(trimmed);
  if (!isNaN(nativeDate.getTime())) {
    return { date: nativeDate, display: formatDisplayDate(nativeDate) };
  }

  return { date: null, display: trimmed };
}

import { getLanguage } from './i18n';

export function formatDisplayDate(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  const lang = getLanguage();

  if (daysDiff === 0) {
    return lang === 'zh' ? `今天 ${formatTime(date)}` : `Today ${formatTime(date)}`;
  } else if (daysDiff === 1) {
    return lang === 'zh' ? `明天 ${formatTime(date)}` : `Tomorrow ${formatTime(date)}`;
  } else if (daysDiff === -1) {
    return lang === 'zh' ? `昨天` : `Yesterday`;
  } else if (daysDiff > 1 && daysDiff <= 7) {
    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayNames = lang === 'zh' ? dayNamesZh : dayNamesEn;
    return `${dayNames[date.getDay()]} ${formatTime(date)}`;
  } else {
    if (lang === 'zh') {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${formatTime(date)}`;
    }
    return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
  }
}

export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

export function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDueDateClass(dateStr: string | null): string {
  if (!dateStr) return '';
  const days = getDaysUntil(dateStr);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  if (days === 1) return 'due-tomorrow';
  return '';
}
