import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import WorkoutsView from "@/modules/workouts/presentation/components/WorkoutsView";

export default async function WorkoutsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <WorkoutsView userId={user.id} />;
}
