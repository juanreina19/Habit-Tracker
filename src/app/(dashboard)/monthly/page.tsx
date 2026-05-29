import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import MonthlyView from "@/modules/habits/presentation/components/MonthlyView";

export default async function MonthlyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MonthlyView userId={user.id} />;
}
