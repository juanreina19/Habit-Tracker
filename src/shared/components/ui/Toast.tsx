"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useContext, useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  open: boolean;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { ...opts, id, open: true }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: false } : t))
    );
    // Clean up after animation
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="down">
        {children}

        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            open={toast.open}
            onOpenChange={(open) => { if (!open) dismiss(toast.id); }}
            duration={toast.duration ?? 3000}
            className="flex items-center gap-3 px-4 py-3 rounded-[16px] shadow-lg"
            style={{
              background: "#1C1C1C",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              maxWidth: "calc(100vw - 40px)",
              width: "fit-content",
            }}
          >
            <RadixToast.Description
              className="text-sm font-medium flex-1"
              style={{ color: "#FFFFFF" }}
            >
              {toast.message}
            </RadixToast.Description>

            {toast.actionLabel && toast.onAction && (
              <RadixToast.Action
                altText={toast.actionLabel}
                onClick={() => {
                  toast.onAction?.();
                  dismiss(toast.id);
                }}
                className="text-sm font-semibold px-3 py-1 rounded-[10px] transition-opacity active:opacity-70 flex-shrink-0"
                style={{ color: "#4CAF82", background: "rgba(76,207,130,0.12)" }}
              >
                {toast.actionLabel}
              </RadixToast.Action>
            )}
          </RadixToast.Root>
        ))}

        <RadixToast.Viewport
          className="fixed z-[300] flex flex-col gap-2 items-center"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(env(safe-area-inset-bottom) + 100px)",
            width: "max-content",
            maxWidth: "calc(100vw - 40px)",
          }}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
