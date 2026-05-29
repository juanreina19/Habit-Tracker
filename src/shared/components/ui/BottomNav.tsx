"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CalendarDays, Calendar, BarChart2, Settings2 } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

const navItems = [
  { href: "/today",    label: "Hoy",     Icon: Sun },
  { href: "/weekly",   label: "Semana",  Icon: CalendarDays },
  { href: "/monthly",  label: "Mes",     Icon: Calendar },
  { href: "/stats",    label: "Stats",   Icon: BarChart2 },
  { href: "/settings", label: "Ajustes", Icon: Settings2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed z-50"
      style={{
        left: "16px",
        right: "16px",
        bottom: "calc(env(safe-area-inset-bottom) + 16px)",
        background: "rgba(20, 20, 22, 0.45)",
        backdropFilter: "blur(48px) saturate(200%) brightness(1.1)",
        WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(1.1)",
        borderRadius: "26px",
        border: "1px solid rgba(255,255,255,0.13)",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.45), " +
          "0 2px 8px rgba(0,0,0,0.25), " +
          "inset 0 1px 0 rgba(255,255,255,0.12), " +
          "inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2.5">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-[16px] transition-all min-w-[52px]",
                isActive ? "opacity-100" : "opacity-35 active:opacity-60"
              )}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                color="#FFFFFF"
              />
              <span
                className="text-[10px] font-medium tracking-wide"
                style={{ color: isActive ? "#FFFFFF" : "#8888AA" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
