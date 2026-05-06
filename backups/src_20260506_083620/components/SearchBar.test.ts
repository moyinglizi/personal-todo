import { describe, it, expect, beforeEach } from 'vitest';
import { renderSearchBar } from './SearchBar';
import { setLanguage, t } from '../services/i18n';

describe('SearchBar', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderSearchBar', () => {
    it('should render search bar container', () => {
      const html = renderSearchBar('', () => {});
      expect(html).toContain('search-bar');
    });

    it('should render search icon', () => {
      const html = renderSearchBar('', () => {});
      expect(html).toContain('search-icon');
      expect(html).toContain('🔍');
    });

    it('should render search input', () => {
      const html = renderSearchBar('', () => {});
      expect(html).toContain('search-input');
      expect(html).toContain('type="text"');
    });

    it('should render placeholder text', () => {
      const html = renderSearchBar('', () => {});
      expect(html).toContain('placeholder');
      expect(html).toContain(t('searchPlaceholder'));
    });

    it('should render search query value', () => {
      const html = renderSearchBar('test query', () => {});
      expect(html).toContain('value="test query"');
    });

    it('should escape HTML in search query', () => {
      const html = renderSearchBar('<script>alert(1)</script>', () => {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should show clear button when query is present', () => {
      const html = renderSearchBar('test', () => {});
      expect(html).toContain('clear-search');
      expect(html).toContain('×');
    });

    it('should not show clear button when query is empty', () => {
      const html = renderSearchBar('', () => {});
      expect(html).not.toContain('clear-search');
    });

    it('should have oninput handler', () => {
      const html = renderSearchBar('', () => {});
      expect(html).toContain('oninput="window.todoApp.search');
    });

    it('should have onclick handler for clear button', () => {
      const html = renderSearchBar('test', () => {});
      expect(html).toContain('onclick="window.todoApp.clearSearch()');
    });
  });
});
