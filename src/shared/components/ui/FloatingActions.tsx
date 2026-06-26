"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ListTodo, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function FloatingActions() {
  const pathname = usePathname();
  const t = useTranslations("quickAdd");
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/settings")) return null;

  return (
    <>
      {/* FAB button — always black circle, white icon */}
      <div className="fixed z-30 right-5 bottom-[calc(env(safe-area-inset-bottom)+96px)] lg:right-8 lg:bottom-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: "#000000",
            color: "#FFFFFF",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Plus size={22} strokeWidth={2} />
        </button>
      </div>

      {/* Centered dialog */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[220px] rounded-lg p-2"
              style={{ background: "#000000", border: "1px solid var(--border)" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-sm transition-colors"
                style={{ color: "#FFFFFF" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ListTodo size={18} strokeWidth={1.5} />
                {t("new_task")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-sm transition-colors"
                style={{ color: "#FFFFFF" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Sparkles size={18} strokeWidth={1.5} />
                {t("new_habit")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
