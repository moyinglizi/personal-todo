import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseFlexibleDate } from './parser';

// Mock the module-level `now` in parser.ts to ensure consistent test results
vi.mock('./i18n', () => ({
  getLanguage: () => 'zh'
}));

describe('parseFlexibleDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses "tomorrow" and returns next day', () => {
    const result = parseFlexibleDate('tomorrow');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getDate()).toBe(18);
  });

  it('parses "3 days" and adds 3 days', () => {
    const result = parseFlexibleDate('3 days');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getDate()).toBe(20);
  });

  it('parses "2026-04-20" correctly', () => {
    const result = parseFlexibleDate('2026-04-20');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getFullYear()).toBe(2026);
    expect(result.date!.getMonth()).toBe(3); // April is 3 (0-indexed)
    expect(result.date!.getDate()).toBe(20);
  });

  it('parses "0417 8:00" (month-day time)', () => {
    const result = parseFlexibleDate('0417 8:00');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getMonth()).toBe(3); // April is 3
    expect(result.date!.getDate()).toBe(17);
  });

  it('parses "friday" (next friday)', () => {
    const result = parseFlexibleDate('friday');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getDay()).toBe(5); // Friday is 5
  });

  it('parses "2h" (2 hours from now)', () => {
    const result = parseFlexibleDate('2h');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getHours()).toBe(12);
  });

  it('returns null for empty string', () => {
    const result = parseFlexibleDate('');
    expect(result.date).toBeNull();
    expect(result.display).toBe('');
  });

  it('returns null for unparseable input', () => {
    const result = parseFlexibleDate('asdfghjkl');
    expect(result.date).toBeNull();
  });

  it('parses "-2 days" (past date)', () => {
    const result = parseFlexibleDate('-2 days');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.getDate()).toBe(15);
  });
});