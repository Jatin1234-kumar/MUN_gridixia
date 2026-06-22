import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-blue-400" />,
};

const borders: Record<ToastVariant, string> = {
  success: 'border-emerald-500/20 bg-emerald-500/10',
  error: 'border-red-500/20 bg-red-500/10',
  info: 'border-blue-500/20 bg-blue-500/10',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-white shadow-lg backdrop-blur-xl animate-[fade-up_0.3s_ease-out]',
        borders[toast.variant],
      )}
    >
      {icons[toast.variant]}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
