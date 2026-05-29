"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils/cn";

const navItems = [
  { href: "/today",    label: "Hoy",      icon: "☀️" },
  { href: "/weekly",   label: "Semana",   icon: "📅" },
  { href: "/monthly",  label: "Mes",      icon: "🗓" },
  { href: "/stats",    label: "Stats",    icon: "📊" },
  { href: "/settings", label: "Ajustes",  icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 safe-bottom z-50"
      style={{
        background: "rgba(26, 26, 46, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-[12px] transition-all min-w-[56px]",
                isActive ? "opacity-100" : "opacity-40 active:opacity-70"
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span
                className={cn("text-[10px] font-medium tracking-wide")}
                style={{ color: isActive ? "#FFFFFF" : "#8888AA" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
