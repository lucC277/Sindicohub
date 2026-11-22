import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-body">
        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
