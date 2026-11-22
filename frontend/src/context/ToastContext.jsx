import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', durationMs = 4200) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (durationMs > 0) {
        window.setTimeout(() => removeToast(id), durationMs);
      }
    },
    [removeToast],
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success: (msg) => addToast(msg, 'success'),
      error: (msg) => addToast(msg, 'error', 5600),
      warning: (msg) => addToast(msg, 'warning'),
      info: (msg) => addToast(msg, 'info'),
    }),
    [toasts, addToast, removeToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser utilizado dentro de ToastProvider.');
  }
  return ctx;
}
