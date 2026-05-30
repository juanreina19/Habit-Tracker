"use client";

import { useState, useEffect, useCallback } from "react";

const LS_ENABLED = "notif_enabled";
const LS_TIME = "notif_time";
const DEFAULT_TIME = "20:00";

type Permission = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buf;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<Permission>("default");
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTimeState] = useState(DEFAULT_TIME);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as Permission);
    setIsEnabled(localStorage.getItem(LS_ENABLED) === "true");
    setReminderTimeState(localStorage.getItem(LS_TIME) ?? DEFAULT_TIME);
  }, []);

  const requestPermission = useCallback(async (): Promise<Permission> => {
    if (!("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    const p = result as Permission;
    setPermission(p);
    return p;
  }, []);

  const enable = useCallback(async (): Promise<Permission> => {
    setSubscribeError(null);
    setIsLoading(true);

    try {
      // 1. Request browser permission
      const p = permission === "default" ? await requestPermission() : permission;
      if (p !== "granted") {
        setIsLoading(false);
        return p;
      }

      // 2. Subscribe via PushManager
      if (!("PushManager" in window)) throw new Error("Push no soportado en este navegador");

      const registration = await navigator.serviceWorker.ready;

      // Strip BOM (U+FEFF) that Vercel env pull can inject
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.replace(/^﻿/, "").trim();
      if (!vapidKey) throw new Error("VAPID key no configurada");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 3. Save subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

      setIsEnabled(true);
      localStorage.setItem(LS_ENABLED, "true");
      setIsLoading(false);
      return p;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Push] Error al suscribir:", err);
      setSubscribeError(msg);
      setIsLoading(false);
      return "denied" as Permission;
    }
  }, [permission, requestPermission]);

  const disable = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
    } catch (err) {
      console.error("[Push] Error al desuscribir:", err);
    }

    setIsEnabled(false);
    setSubscribeError(null);
    localStorage.setItem(LS_ENABLED, "false");
  }, []);

  const setReminderTime = useCallback((time: string) => {
    setReminderTimeState(time);
    localStorage.setItem(LS_TIME, time);
  }, []);

  return { permission, isEnabled, reminderTime, enable, disable, setReminderTime, subscribeError, isLoading };
}
