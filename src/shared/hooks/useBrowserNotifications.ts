"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const LS_ENABLED = "notif_enabled";
const LS_TIME = "notif_time";
const DEFAULT_TIME = "20:00";

type Permission = "default" | "granted" | "denied" | "unsupported";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<Permission>("default");
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTimeState] = useState(DEFAULT_TIME);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted preferences and current permission on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as Permission);
    const savedEnabled = localStorage.getItem(LS_ENABLED) === "true";
    const savedTime = localStorage.getItem(LS_TIME) ?? DEFAULT_TIME;
    setIsEnabled(savedEnabled);
    setReminderTimeState(savedTime);
  }, []);

  // Schedule (or cancel) the reminder whenever enabled/time/permission changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isEnabled || permission !== "granted") return;

    const scheduleNext = () => {
      const [hh, mm] = reminderTime.split(":").map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hh, mm, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1); // next day if past

      const msUntil = target.getTime() - now.getTime();
      timerRef.current = setTimeout(() => {
        new Notification("Habit Tracker 🔥", {
          body: "¿Ya completaste tus hábitos hoy?",
          icon: "/icon-192.png",
        });
        scheduleNext(); // schedule for the next day
      }, msUntil);
    };

    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isEnabled, permission, reminderTime]);

  const requestPermission = useCallback(async (): Promise<Permission> => {
    if (!("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    const p = result as Permission;
    setPermission(p);
    return p;
  }, []);

  const enable = useCallback(async () => {
    const p = permission === "default" ? await requestPermission() : permission;
    if (p === "granted") {
      setIsEnabled(true);
      localStorage.setItem(LS_ENABLED, "true");
    }
    return p;
  }, [permission, requestPermission]);

  const disable = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem(LS_ENABLED, "false");
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const setReminderTime = useCallback((time: string) => {
    setReminderTimeState(time);
    localStorage.setItem(LS_TIME, time);
  }, []);

  return { permission, isEnabled, reminderTime, enable, disable, setReminderTime };
}
