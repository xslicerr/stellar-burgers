import styles from './modal-overlay.module.css';

export const ModalOverlayUI = ({
  onClick,
}: {
  onClick: () => void;
}): React.JSX.Element => (
  <div data-testid="modal-overlay" className={styles.overlay} onClick={onClick} />
);
