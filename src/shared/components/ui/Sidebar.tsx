"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, CalendarRange, Sparkles, BookOpen, Settings2, Plus, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";
import { QuickAddMenu } from "@/shared/components/ui/QuickAddMenu";

const NAV_ROUTES = [
  { href: "/",         key: "home",     Icon: Home },
  { href: "/planner",  key: "planner",  Icon: CalendarRange },
  { href: "/habits",   key: "habits",   Icon: Sparkles },
  { href: "/studies",  key: "studies",  Icon: BookOpen },
  { href: "/settings", key: "settings", Icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("nav");
  const ts = useTranslations("settings");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Tooltip key={href} label={t(key as Parameters<typeof t>[0])}>
                <Link
                  href={href}
                  className={`sidebar-link relative flex items-center justify-center py-2.5 rounded-md ${isActive ? "sidebar-active" : ""}`}
                  style={{ color: isActive ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.25} />
                </Link>
              </Tooltip>
            );
          })}

          {/* Quick-Add */}
          <div className="relative mt-2">
            <Tooltip label={t("quick_add")}>
              <button
                onClick={() => setQuickAddOpen((o) => !o)}
                className="sidebar-link w-full flex items-center justify-center py-2.5 rounded-md transition-all"
                style={{ color: "var(--text-secondary)" }}
              >
                <Plus size={20} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
          </div>
        </nav>

        {/* Theme toggle */}
        <div className="px-2.5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Tooltip label={theme === "dark" ? ts("theme_light") : ts("theme_dark")}>
            <button
              onClick={toggleTheme}
              className="sidebar-link w-full flex items-center justify-center py-2.5 rounded-md transition-all"
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
