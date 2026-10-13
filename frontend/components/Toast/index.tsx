import { FC } from "react";
import styles from "./page.module.css";

export type ToastVariant = "success" | "error";

type ToastProps = {
  variant: ToastVariant;
  title: string;
  message?: string;
  onDismiss: () => void;
};

const CheckIcon: FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const AlertIcon: FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </svg>
);

// Stateless: timing, dismissal and live-region placement belong to ToastProvider.
const Toast: FC<ToastProps> = ({ variant, title, message, onDismiss }) => {
  return (
    <div className={`${styles.toast} ${styles[variant]}`}>
      <span className={styles.icon}>{variant === "success" ? <CheckIcon /> : <AlertIcon />}</span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {message && <p className={styles.message}>{message}</p>}
      </div>
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
};

export default Toast;
