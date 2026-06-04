"use client";

import { useRouter } from "next/navigation";

export type Locale = "es" | "en";

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const router = useRouter();

  const locale: Locale =
    typeof document !== "undefined"
      ? ((document.documentElement.lang as Locale) ?? "es")
      : "es";

  const setLocale = (l: Locale) => {
    document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return { locale, setLocale };
}
