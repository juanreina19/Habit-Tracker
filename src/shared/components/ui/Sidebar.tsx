"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Home, CalendarRange, Repeat, BookOpen, Dumbbell, Settings2, Sun, Moon, LogOut, MoreVertical } from "lucide-react";
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

// Misma receta de sombra que BottomNav — familia visual "dock flotante"
// compartida entre el nav inferior de mobile y estas pills de desktop.
const FLOATING_SHADOW =
  "0 8px 40px rgba(0,0,0,0.45), " +
  "0 2px 8px rgba(0,0,0,0.25), " +
  "inset 0 1px 0 rgba(255,255,255,0.08), " +
  "inset 0 -1px 0 rgba(0,0,0,0.1)";

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
      {/* Tema — pill propia, fija arriba del todo (independiente del bloque
          de vistas centrado). */}
      <div
        className="hidden lg:flex fixed left-4 top-6 z-40 p-1.5 rounded-full glass-panel-strong"
        style={{ boxShadow: FLOATING_SHADOW }}
      >
        <Tooltip label={theme === "dark" ? ts("theme_light") : ts("theme_dark")}>
          <button
            onClick={toggleTheme}
            className="sidebar-link w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>
        </Tooltip>
      </div>

      {/* Vistas — pill flotante, centrada verticalmente en el viewport */}
      <nav
        className="hidden lg:flex flex-col fixed left-4 top-1/2 z-40 gap-1 p-1.5 rounded-[28px] glass-panel-strong"
        style={{ transform: "translateY(-50%)", boxShadow: FLOATING_SHADOW }}
      >
        {NAV_ROUTES.map(({ href, key, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Tooltip key={href} label={t(key as Parameters<typeof t>[0])}>
              <Link
                href={href}
                className={`sidebar-link flex items-center justify-center w-10 h-10 rounded-full ${isActive ? "sidebar-active" : ""}`}
                style={{ color: isActive ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
              >
                <Icon size={18} strokeWidth={2} />
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      {/* Cuenta — un solo botón que abre un menú con Settings / Cerrar sesión,
          en vez de 2 botones sueltos abajo. */}
      <div
        className="hidden lg:flex fixed left-4 bottom-6 z-40 p-1.5 rounded-full glass-panel-strong"
        style={{ boxShadow: FLOATING_SHADOW }}
      >
        <DropdownMenu.Root>
          <Tooltip label={ts("title")}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="sidebar-link w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                style={{ color: pathname.startsWith("/settings") ? "var(--sidebar-active-color)" : "var(--text-secondary)" }}
              >
                <MoreVertical size={18} strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
          </Tooltip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="right"
              sideOffset={10}
              align="end"
              className="z-50 rounded-lg py-1.5 shadow-lg min-w-[170px] glass-panel-elevated"
            >
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer outline-none data-[highlighted]:opacity-70"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Settings2 size={14} strokeWidth={2} />
                  {t("settings")}
                </Link>
              </DropdownMenu.Item>
              <div className="my-1.5 mx-3 h-px" style={{ background: "var(--border)" }} />
              <DropdownMenu.Item
                onSelect={() => setConfirmLogout(true)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer outline-none data-[highlighted]:opacity-70"
                style={{ color: "var(--danger)" }}
              >
                <LogOut size={14} strokeWidth={2} />
                {ts("sign_out")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Confirm logout modal — hermano de las pills flotantes, no
          descendiente, para no depender de dónde caiga su containing block. */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <div className="w-full max-w-sm rounded-xl p-6 glass-panel-elevated">
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
    </TooltipProvider>
  );
}
