import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Public key is safe in source — avoids env var encoding issues
const VAPID_PUBLIC_KEY = "BKoHSjx2S8H0eihA_50XjrlJC23yEujVemY1TIGsHcWtIxhn5onRFUVAYO4fdZ1E3L_OLG65Pj8yjqRfBDEibbA";
const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s).trim();

export async function GET(request: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Configure VAPID inside the handler so it runs at request time, not build time
  webpush.setVapidDetails(
    stripBOM(process.env.VAPID_SUBJECT ?? "mailto:croldanr5@gmail.com"),
    VAPID_PUBLIC_KEY,
    stripBOM(process.env.VAPID_PRIVATE_KEY ?? "")
  );

  // Service role client bypasses RLS to read all subscriptions
  const supabase = createClient(
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
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
          if (err.statusCode === 404 || err.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          }
          throw err;
        })
    )
  );

  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed, cleaned: staleEndpoints.length });
}
