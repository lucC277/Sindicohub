import { X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export function ToastStack() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dispensar aviso"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
