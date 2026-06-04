"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, CalendarRange, ListTodo, BarChart2, Settings2, Moon } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";

const NAV_ROUTES = [
  { href: "/today",    key: "today",    Icon: Sun },
  { href: "/calendar", key: "calendar", Icon: CalendarRange },
  { href: "/habits",   key: "habits",   Icon: ListTodo },
  { href: "/stats",    key: "stats",    Icon: BarChart2 },
  { href: "/settings", key: "settings", Icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("nav");
  const ts = useTranslations("settings");

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
        {NAV_ROUTES.map(({ href, key, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-[12px] ${isActive ? "sidebar-active" : ""}`}
              style={{ color: isActive ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-sm font-medium">{t(key as Parameters<typeof t>[0])}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={toggleTheme}
          className="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          <span className="text-sm font-medium">
            {theme === "dark" ? ts("theme_light") : ts("theme_dark")}
          </span>
        </button>
      </div>
    </aside>
  );
}
