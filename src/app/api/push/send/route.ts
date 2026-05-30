import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const stripBOM = (s: string) => s.replace(/^﻿/, "");

webpush.setVapidDetails(
  stripBOM(process.env.VAPID_SUBJECT!),
  stripBOM(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  stripBOM(process.env.VAPID_PRIVATE_KEY!)
);

export async function POST(request: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service role client bypasses RLS to read all subscriptions
  const supabase = createClient(
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY!)
  );

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscriptions?.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({
    title: "Habit Tracker 🔥",
    body: "¿Ya completaste tus hábitos hoy?",
    url: "/today",
  });

  const staleEndpoints: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        .catch((err: { statusCode?: number }) => {
          // 404/410 = subscription expired, remove it
          if (err.statusCode === 404 || err.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          }
          throw err;
        })
    )
  );

  // Clean up expired subscriptions
  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed, cleaned: staleEndpoints.length });
}
