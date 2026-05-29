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
      className="fixed bottom-0 left-0 right-0 safe-bottom z-50"
      style={{
        background: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-[12px] transition-all min-w-[56px]",
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
