import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import WeeklyView from "@/modules/habits/presentation/components/WeeklyView";

export default async function WeeklyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <WeeklyView userId={user.id} userCreatedAt={user.created_at} />;
}
