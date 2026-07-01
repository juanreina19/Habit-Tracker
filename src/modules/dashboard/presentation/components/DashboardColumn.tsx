"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  color?: string | null;
  count?: number;
  onAdd?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardColumn({
  title, color, count, onAdd, collapsible = false, defaultCollapsed = false, headerRight, children,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="flex flex-col min-w-0 w-full lg:w-[300px] lg:min-w-[280px] lg:flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {color && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        )}
        <button
          type="button"
          onClick={collapsible ? () => setCollapsed(p => !p) : undefined}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)", cursor: collapsible ? "pointer" : "default" }}
        >
          {title}
          {count !== undefined && (
            <span style={{ color: "var(--text-muted)" }}>({count})</span>
          )}
          {collapsible && (
            collapsed
              ? <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
              : <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
          )}
        </button>

        <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />

        {headerRight}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="w-6 h-6 rounded-sm flex items-center justify-center transition-opacity active:opacity-70"
            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
          >
            <Plus size={14} strokeWidth={1} />
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 lg:overflow-y-auto lg:pr-0.5" style={{ maxHeight: "min(600px, 65vh)" }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
