"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Locale = "es" | "en";

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const router = useRouter();

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document !== "undefined") {
      return (document.documentElement.lang as Locale) ?? "es";
    }
    return "es";
  });

  const setLocale = (l: Locale) => {
    document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
    setLocaleState(l);
    router.refresh();
  };

  return { locale, setLocale };
}
