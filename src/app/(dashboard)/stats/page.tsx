import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import StatsView from "@/modules/habits/presentation/components/StatsView";

export default async function StatsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <StatsView userId={user.id} userCreatedAt={user.created_at} />;
}
