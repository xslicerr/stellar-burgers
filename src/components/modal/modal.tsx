import { ModalUI } from '@ui';
import { memo, useEffect } from 'react';
import ReactDOM from 'react-dom';

import type { TModalProps } from './type';

const modalRoot = document.getElementById('modals');

export const Modal = memo(function Modal({
  title,
  onClose,
  children,
}: TModalProps): React.JSX.Element {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return (): void => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <ModalUI title={title} onClose={onClose}>
      {children}
    </ModalUI>,
    modalRoot as HTMLDivElement
  );
});
