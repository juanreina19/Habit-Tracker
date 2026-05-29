import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import TodayView from "@/modules/habits/presentation/components/TodayView";

export default async function TodayPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <TodayView userId={user!.id} />;
}
