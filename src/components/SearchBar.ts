import { t } from '../services/i18n';

export function renderSearchBar(
  searchQuery: string,
  onSearch: (query: string) => void
): string {
  return `
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        id="search-input"
        placeholder="${t('searchPlaceholder')}"
        value="${escapeHtml(searchQuery)}"
        oninput="window.todoApp.search(this.value)"
      />
      ${searchQuery ? `<button class="clear-search" onclick="window.todoApp.clearSearch()">×</button>` : ''}
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
