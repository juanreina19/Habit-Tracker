"use client";

import { useEffect } from "react";

export function PWARegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — could show a toast here
              console.info("[PWA] Nueva versión disponible. Recarga para actualizar.");
            }
          });
        });
      })
      .catch((err) => console.warn("[PWA] Error al registrar service worker:", err));
  }, []);

  return null;
}
