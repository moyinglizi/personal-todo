import { t } from '../services/i18n';

export function renderConfirmModal(
  title: string,
  message: string
): string {
  return `
    <div class="confirm-modal-overlay" onclick="window.todoApp.closeConfirmModal()">
      <div class="confirm-modal" onclick="event.stopPropagation()">
        <div class="confirm-modal-icon">⚠️</div>
        <h3 class="confirm-modal-title">${escapeHtml(title)}</h3>
        <p class="confirm-modal-message">${escapeHtml(message)}</p>
        <div class="confirm-modal-actions">
          <button class="btn-secondary" onclick="window.todoApp.closeConfirmModal()">${t('cancel')}</button>
          <button class="btn-danger" onclick="window.todoApp.executeConfirm()">${t('delete')}</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}