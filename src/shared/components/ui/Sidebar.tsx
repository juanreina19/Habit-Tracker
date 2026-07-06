"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, CalendarRange, Repeat, BookOpen, Settings2, Sun, Moon, User, LogOut } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";
import { createClient } from "@/shared/lib/supabase/client";

const NAV_ROUTES = [
  { href: "/",         key: "home",     Icon: Home },
  { href: "/planner",  key: "planner",  Icon: CalendarRange },
  { href: "/habits",   key: "habits",   Icon: Repeat },
  { href: "/studies",  key: "studies",  Icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("nav");
  const ts = useTranslations("settings");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const client = createClient();
    await client.auth.signOut();
    router.push("/login");
  };

  return (
    <TooltipProvider>
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[var(--sidebar-width)] z-40"
        style={{ background: "var(--sidebar-bg)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-6">
          <span className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            HT
          </span>
        </div>
        {/* Divider */}
        <div className="mx-4 h-px" style={{ background: "var(--border)" }} />

        {/* Nav items */}
        <nav className="flex-1 px-2.5 py-4 flex flex-col gap-1">
          {NAV_ROUTES.map(({ href, key, Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Tooltip key={href} label={t(key as Parameters<typeof t>[0])}>
                <Link
                  href={href}
                  className={`sidebar-link relative flex items-center justify-center py-2 rounded-md ${isActive ? "sidebar-active" : ""}`}
                  style={{ color: isActive ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                      style={{ background: "var(--sidebar-active-color)" }}
                    />
                  )}
                  <Icon size={20} strokeWidth={1} />
                </Link>
              </Tooltip>
            );
          })}

        </nav>

        {/* Divider */}
        <div className="mx-4 h-px" style={{ background: "var(--border)" }} />

        {/* Bottom section — theme, settings, profile, logout */}
        <div className="px-2.5 py-3 flex flex-col gap-1">
          {/* Theme toggle */}
          <Tooltip label={theme === "dark" ? ts("theme_light") : ts("theme_dark")}>
            <button
              onClick={toggleTheme}
              className="sidebar-link w-full flex items-center justify-center py-2 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
            </button>
          </Tooltip>

          {/* Settings */}
          <Tooltip label={t("settings")}>
            <Link
              href="/settings"
              className={`sidebar-link relative flex items-center justify-center py-2 rounded-md ${pathname.startsWith("/settings") ? "sidebar-active" : ""}`}
              style={{ color: pathname.startsWith("/settings") ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
            >
              <Settings2 size={20} strokeWidth={1} />
            </Link>
          </Tooltip>

          {/* Divider */}
          <div className="mx-3 my-1 h-px" style={{ background: "var(--border)" }} />

          {/* Profile */}
          <Tooltip label={ts("my_profile")}>
            <Link
              href="/settings"
              className="sidebar-link flex items-center justify-center py-2 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <User size={20} strokeWidth={1.5} />
            </Link>
          </Tooltip>

          {/* Logout */}
          <div className="relative">
            <Tooltip label={ts("sign_out")}>
              <button
                onClick={() => setConfirmLogout(true)}
                disabled={loggingOut}
                className="sidebar-link w-full flex items-center justify-center py-2 rounded-md transition-colors disabled:opacity-40"
                style={{ color: "var(--text-secondary)" }}
              >
                <LogOut size={20} strokeWidth={1.5} />
              </button>
            </Tooltip>

            {/* Confirm logout popover */}
            {confirmLogout && (
              <div
                className="absolute left-full bottom-0 ml-2 z-50 rounded-md p-3 w-48 flex flex-col gap-2"
                style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {ts("sign_out_confirm")}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmLogout(false)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
                  >
                    {ts("cancel")}
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex-1 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                    style={{ background: "var(--danger)", color: "#fff" }}
                  >
                    {loggingOut ? "…" : ts("sign_out")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
