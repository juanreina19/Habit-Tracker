"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CalendarRange, ListTodo, BarChart2, Settings2, Moon } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";

const navItems = [
  { href: "/today",    label: "Hoy",        Icon: Sun },
  { href: "/calendar", label: "Calendario", Icon: CalendarRange },
  { href: "/habits",   label: "Hábitos",    Icon: ListTodo },
  { href: "/stats",    label: "Stats",      Icon: BarChart2 },
  { href: "/settings", label: "Ajustes",    Icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[220px] z-40 border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--text-secondary)" }}>
          Habit
        </p>
        <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Tracker
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all"
              style={{
                background: isActive ? "var(--surface-elevated)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          <span className="text-sm font-medium">
            {theme === "dark" ? "Tema claro" : "Tema oscuro"}
          </span>
        </button>
      </div>
    </aside>
  );
}
