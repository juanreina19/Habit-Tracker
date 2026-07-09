"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, CalendarRange, Repeat, BookOpen, Dumbbell, Settings2, Sun, Moon, User, LogOut } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";
import { createClient } from "@/shared/lib/supabase/client";

const NAV_ROUTES = [
  { href: "/",         key: "home",     Icon: Home },
  { href: "/planner",  key: "planner",  Icon: CalendarRange },
  { href: "/habits",   key: "habits",   Icon: Repeat },
  { href: "/studies",  key: "studies",  Icon: BookOpen },
  { href: "/workouts", key: "workouts", Icon: Dumbbell },
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
        <div className="mx-5 h-px" style={{ background: "var(--border)" }} />

        {/* Nav items */}
        <nav className="flex-1 px-0.5 py-4 flex flex-col gap-1">
          {NAV_ROUTES.map(({ href, key, Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <div key={href} className="relative">
                <Tooltip label={t(key as Parameters<typeof t>[0])}>
                  <Link
                    href={href}
                    className={`sidebar-link flex items-center justify-center w-10 h-10 mx-auto rounded-md ${isActive ? "sidebar-active" : ""}`}
                    style={{ color: isActive ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </Link>
                </Tooltip>
                {isActive && (
                  <span
                    className="absolute -left-0.5 top-2.5 bottom-2.5 w-[1.5px] rounded-full"
                    style={{ background: "var(--sidebar-active-color)" }}
                  />
                )}
              </div>
            );
          })}

        </nav>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ background: "var(--border)" }} />

        {/* Bottom section — theme, settings, profile, logout */}
        <div className="px-0.5 py-3 flex flex-col gap-1">
          {/* Theme toggle */}
          <Tooltip label={theme === "dark" ? ts("theme_light") : ts("theme_dark")}>
            <button
              onClick={toggleTheme}
              className="sidebar-link w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
            </button>
          </Tooltip>

          {/* Settings */}
          <div className="relative">
            <Tooltip label={t("settings")}>
              <Link
                href="/settings"
                className={`sidebar-link flex items-center justify-center w-10 h-10 mx-auto rounded-md ${pathname.startsWith("/settings") ? "sidebar-active" : ""}`}
                style={{ color: pathname.startsWith("/settings") ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
              >
                <Settings2 size={18} strokeWidth={2} />
              </Link>
            </Tooltip>
            {pathname.startsWith("/settings") && (
              <span
                className="absolute -left-0.5 top-2.5 bottom-2.5 w-[1.5px] rounded-full"
                style={{ background: "var(--sidebar-active-color)" }}
              />
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 my-1 h-px" style={{ background: "var(--border)" }} />

          {/* Profile */}
          <Tooltip label={ts("my_profile")}>
            <Link
              href="/settings"
              className="sidebar-link w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <User size={18} strokeWidth={2} />
            </Link>
          </Tooltip>

          {/* Logout */}
          <div className="relative">
            <Tooltip label={ts("sign_out")}>
              <button
                onClick={() => setConfirmLogout(true)}
                disabled={loggingOut}
                className="sidebar-link w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
                style={{ color: "var(--text-secondary)" }}
              >
                <LogOut size={18} strokeWidth={2} />
              </button>
            </Tooltip>

            {/* Confirm logout modal — centrado en pantalla, no popover pegado
                al botón; mismo patrón de fixed inset-0 + backdrop ya usado
                en HabitsView.tsx, con bg de fondo (no surface) + borde sutil. */}
            {confirmLogout && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-6"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
              >
                <div
                  className="w-full max-w-sm rounded-xl p-6"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {ts("sign_out_confirm")}
                  </p>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setConfirmLogout(false)}
                      className="flex-1 py-2 rounded-md text-sm"
                      style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
                    >
                      {ts("cancel")}
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex-1 py-2 rounded-md text-sm disabled:opacity-50"
                      style={{ background: "var(--danger)", color: "#fff" }}
                    >
                      {loggingOut ? "…" : ts("sign_out")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
