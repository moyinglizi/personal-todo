import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLanguage, getLanguage, getTranslations, type Language } from './i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  it('getLanguage returns current language', () => {
    expect(getLanguage()).toBe('en');
  });

  it('setLanguage changes language', () => {
    setLanguage('zh');
    expect(getLanguage()).toBe('zh');
  });

  it('t() returns English translation for "appName"', () => {
    setLanguage('en');
    expect(t('appName')).toBe('Personal Todo');
  });

  it('t() returns Chinese translation for "appName"', () => {
    setLanguage('zh');
    expect(t('appName')).toBe('个人待办');
  });

  it('t() returns translation for "newTodo"', () => {
    setLanguage('en');
    expect(t('newTodo')).toBe('New Todo');
    setLanguage('zh');
    expect(t('newTodo')).toBe('新建待办');
  });

  it('getTranslations() returns all translations for current language', () => {
    const en = getTranslations();
    expect(en.appName).toBe('Personal Todo');
    expect(en.newTodo).toBe('New Todo');

    setLanguage('zh');
    const zh = getTranslations();
    expect(zh.appName).toBe('个人待办');
    expect(zh.newTodo).toBe('新建待办');
  });
});