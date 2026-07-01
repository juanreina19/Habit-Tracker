"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, CalendarRange, Repeat, Settings2 } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

const NAV_ROUTES = [
  { href: "/",         key: "home",     Icon: Home },
  { href: "/planner",  key: "planner",  Icon: CalendarRange },
  { href: "/habits",   key: "habits",   Icon: Repeat },
  { href: "/settings", key: "settings", Icon: Settings2 },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  useEffect(() => {
    NAV_ROUTES.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <nav
      className="fixed z-50 lg:hidden"
      style={{
        left: "16px",
        right: "16px",
        bottom: "calc(env(safe-area-inset-bottom) + 16px)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(48px) saturate(200%) brightness(1.1)",
        WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(1.1)",
        borderRadius: "26px",
        border: "1px solid var(--nav-border)",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.45), " +
          "0 2px 8px rgba(0,0,0,0.25), " +
          "inset 0 1px 0 rgba(255,255,255,0.08), " +
          "inset 0 -1px 0 rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2.5">
        {NAV_ROUTES.map(({ href, key, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[52px]",
                isActive ? "opacity-100" : "opacity-35 active:opacity-60"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              <span
                className="text-[9px] font-medium tracking-wide"
                style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {t(key as Parameters<typeof t>[0])}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
