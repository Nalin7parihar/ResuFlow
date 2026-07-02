import { useToast } from '../contexts/ToastContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const colors = {
          success: {
            bg: 'bg-success-500/10',
            border: 'border-success-500/25',
            icon: 'text-success-400',
            bar: 'bg-success-400',
          },
          error: {
            bg: 'bg-danger-500/10',
            border: 'border-danger-500/25',
            icon: 'text-danger-400',
            bar: 'bg-danger-400',
          },
          info: {
            bg: 'bg-accent-500/10',
            border: 'border-accent-500/25',
            icon: 'text-accent-400',
            bar: 'bg-accent-400',
          },
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto glass rounded-xl border ${colors.border} ${colors.bg} p-4 animate-slide-up shadow-2xl shadow-black/30`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`shrink-0 mt-0.5 ${colors.icon}`}>
                {toast.type === 'success' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                {toast.type === 'info' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>

              {/* Dismiss */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-700/50 transition-colors border-none bg-transparent cursor-pointer text-surface-500 hover:text-surface-300"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-0.5 rounded-full bg-surface-700/30 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bar} animate-toast-progress`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
