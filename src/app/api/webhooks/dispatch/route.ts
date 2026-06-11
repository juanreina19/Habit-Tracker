import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WebhookEventSupabaseRepository } from "@/modules/tasks/infrastructure/supabase/WebhookEventSupabaseRepository";
import { WebhookEndpointSupabaseRepository } from "@/modules/tasks/infrastructure/supabase/WebhookEndpointSupabaseRepository";
import { DispatchPendingWebhooksUseCase } from "@/modules/tasks/domain/use-cases/DispatchPendingWebhooksUseCase";

const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s).trim();

export async function GET(request: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service role client bypasses RLS to dispatch across all users
  const supabase = createClient(
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
  );

  const eventRepo = new WebhookEventSupabaseRepository(supabase);
  const endpointRepo = new WebhookEndpointSupabaseRepository(supabase);
  const useCase = new DispatchPendingWebhooksUseCase(eventRepo, endpointRepo);

  const stats = await useCase.execute();

  return NextResponse.json(stats);
}
