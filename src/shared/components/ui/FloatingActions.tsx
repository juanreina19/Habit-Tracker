"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ClipboardPen, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuickAddStore } from "@/shared/store/quickAddStore";

export function FloatingActions() {
  const pathname = usePathname();
  const t = useTranslations("quickAdd");
  const [open, setOpen] = useState(false);
  const openQuickAdd = useQuickAddStore((s) => s.open);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const timer = setTimeout(() => document.addEventListener("click", close), 10);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [open]);

  if (pathname.startsWith("/settings") || pathname.startsWith("/profile")) return null;

  const handleSelect = (type: "task" | "habit") => {
    setOpen(false);
    openQuickAdd(type);
  };

  return (
    <div
      className="fixed z-30 right-5 lg:right-8"
      style={{ bottom: "var(--floating-button-bottom)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Menu — appears above FAB, siempre por encima del botón de Focus (z-30) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-40 right-5 lg:right-8 min-w-[180px] rounded-md p-1.5"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", bottom: "var(--floating-menu-offset)" }}
          >
            <button
              type="button"
              onClick={() => handleSelect("task")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-normal transition-colors"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ClipboardPen size={16} strokeWidth={1.5} />
              {t("new_task")}
            </button>
            <button
              type="button"
              onClick={() => handleSelect("habit")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-normal transition-colors"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Repeat size={16} strokeWidth={1.5} />
              {t("new_habit")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button — + rotates to × */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{
          background: "#000000",
          color: "#FFFFFF",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Plus size={22} strokeWidth={1} />
        </motion.div>
      </button>
    </div>
  );
}
