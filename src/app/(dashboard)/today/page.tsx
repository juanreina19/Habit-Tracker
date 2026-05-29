import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import TodayView from "@/modules/habits/presentation/components/TodayView";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <TodayView userId={user.id} />;
}
