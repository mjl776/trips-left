"use client";

import { createContext, FC, FocusEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Toast, { type ToastVariant } from "../Toast";
import styles from "./page.module.css";

export type ShowToastOptions = {
  variant: ToastVariant;
  title: string;
  message?: string;
  // ms; defaults to DEFAULT_DURATION for the variant.
  duration?: number;
};

type ActiveToast = ShowToastOptions & { id: number };

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
  dismissToast: () => void;
};

type ToastProviderProps = {
  children: ReactNode;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = { success: 4000, error: 6000 };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside a ToastProvider");
  return context;
}

// One toast at a time: showToast replaces whatever is showing and restarts the timer.
const ToastProvider: FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // `id` keys the toast, so a replacement remounts it and replays the entrance.
  const showToast = useCallback((options: ShowToastOptions) => setToast({ ...options, id: Date.now() }), []);

  const startTimer = useCallback(
    (active: ActiveToast) => {
      clearTimer();
      timerRef.current = setTimeout(dismissToast, active.duration ?? DEFAULT_DURATION[active.variant]);
    },
    [clearTimer, dismissToast],
  );

  // Runs per toast: the cleanup covers replace, dismiss and unmount.
  useEffect(() => {
    if (!toast) return;
    startTimer(toast);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissToast();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimer();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toast, startTimer, clearTimer, dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // Focus moving between elements inside the toast isn't leaving it.
    if (!toast || event.currentTarget.contains(event.relatedTarget)) return;
    startTimer(toast);
  };

  // Hovering or focusing the toast pauses auto-dismiss; leaving restarts it at the full duration.
  const toastElement = toast && (
    <div
      key={toast.id}
      onMouseEnter={clearTimer}
      onMouseLeave={() => startTimer(toast)}
      onFocus={clearTimer}
      onBlur={handleBlur}
    >
      <Toast variant={toast.variant} title={toast.title} message={toast.message} onDismiss={dismissToast} />
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Both live regions stay mounted: a region has to exist before its
          content arrives or screen readers won't announce it. */}
      <div className={styles.viewport}>
        <div role="status" aria-live="polite">
          {toast?.variant === "success" && toastElement}
        </div>
        <div role="alert" aria-live="assertive">
          {toast?.variant === "error" && toastElement}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
