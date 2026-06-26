"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { QuickAddMenu } from "@/shared/components/ui/QuickAddMenu";

export function FloatingActions() {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  if (pathname.startsWith("/settings")) return null;

  return (
    <div className="fixed z-30 right-5 bottom-[calc(env(safe-area-inset-bottom)+96px)] lg:right-8 lg:bottom-8">
      <div className="relative">
        <button
          type="button"
          onClick={() => setQuickAddOpen(o => !o)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Plus size={22} strokeWidth={2} />
        </button>
        <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      </div>
    </div>
  );
}
