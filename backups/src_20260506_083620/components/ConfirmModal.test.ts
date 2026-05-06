import { describe, it, expect, beforeEach } from 'vitest';
import { renderConfirmModal } from './ConfirmModal';
import { setLanguage } from '../services/i18n';

describe('ConfirmModal', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  describe('renderConfirmModal', () => {
    it('should render overlay', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('confirm-modal-overlay');
    });

    it('should render modal container', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('confirm-modal');
    });

    it('should render icon', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('confirm-modal-icon');
      expect(html).toContain('⚠️');
    });

    it('should render title', () => {
      const html = renderConfirmModal('Delete Item', 'Message');
      expect(html).toContain('confirm-modal-title');
      expect(html).toContain('Delete Item');
    });

    it('should render message', () => {
      const html = renderConfirmModal('Title', 'Are you sure?');
      expect(html).toContain('confirm-modal-message');
      expect(html).toContain('Are you sure?');
    });

    it('should escape HTML in title', () => {
      const html = renderConfirmModal('<script>alert(1)</script>', 'Message');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in message', () => {
      const html = renderConfirmModal('Title', '<b>bold</b>');
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;');
    });

    it('should render cancel button', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('btn-secondary');
      expect(html).toContain('Cancel');
    });

    it('should render delete button with danger class', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('btn-danger');
      expect(html).toContain('Delete');
    });

    it('should have close handler on overlay', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('onclick="window.todoApp.closeConfirmModal()"');
    });

    it('should have execute confirm handler on delete button', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('onclick="window.todoApp.executeConfirm()"');
    });

    it('should stop propagation on modal click', () => {
      const html = renderConfirmModal('Title', 'Message');
      expect(html).toContain('onclick="event.stopPropagation()"');
    });
  });
});
