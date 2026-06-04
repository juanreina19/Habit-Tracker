import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import HabitsView from "@/modules/habits/presentation/components/habits/HabitsView";

export default async function HabitsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <HabitsView userId={user.id} />;
}
