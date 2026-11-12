import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { CloseIcon } from './Icons';

/** Accessible modal built on the native <dialog> element (focus trap + Esc). */
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
    >
      <div className="modal__panel">
        <header className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <CloseIcon />
          </button>
        </header>
        <div className="modal__body">{open && children}</div>
      </div>
    </dialog>
  );
}
