import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Hook used by any component to show a non-blocking toast instead of
// window.alert(). Must be called from a component rendered inside <ToastProvider>.
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};

let idCounter = 0;

// Renders a stack of dismissible, auto-expiring toast notifications.
// Replaces window.alert()/window.confirm() style popups, which block the
// whole tab's JS main thread (and can hang indefinitely inside webviews /
// in-app browsers such as LINE or Facebook that suppress native dialogs).
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[200] flex flex-col items-stretch sm:items-end space-y-2 sm:max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto w-full flex items-start gap-2.5 rounded-2xl border p-3.5 shadow-lg backdrop-blur-xs ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : t.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-slate-800 border-slate-700 text-white"
            }`}
          >
            {t.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {t.type === "error" && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line flex-1">
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
