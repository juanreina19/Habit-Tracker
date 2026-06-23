"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, CalendarRange, ListTodo, BarChart2, Settings2, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";

const NAV_ROUTES = [
  { href: "/",         key: "dashboard", Icon: LayoutDashboard },
  { href: "/today",    key: "today",     Icon: Sun },
  { href: "/calendar", key: "calendar",  Icon: CalendarRange },
  { href: "/tasks",    key: "tasks",     Icon: ListTodo },
  { href: "/stats",    key: "stats",     Icon: BarChart2 },
  { href: "/settings", key: "settings",  Icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("nav");
  const ts = useTranslations("settings");

  return (
    <TooltipProvider>
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[72px] z-40 border-r"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-6 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            HT
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2.5 py-4 flex flex-col gap-1">
          {NAV_ROUTES.map(({ href, key, Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname === href;
            return (
              <Tooltip key={href} label={t(key as Parameters<typeof t>[0])}>
                <Link
                  href={href}
                  className={`sidebar-link flex items-center justify-center py-2.5 rounded-[12px] ${isActive ? "sidebar-active" : ""}`}
                  style={{ color: isActive ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="px-2.5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Tooltip label={theme === "dark" ? ts("theme_light") : ts("theme_dark")}>
            <button
              onClick={toggleTheme}
              className="sidebar-link w-full flex items-center justify-center py-2.5 rounded-[12px] transition-all"
              style={{ color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
            </button>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
