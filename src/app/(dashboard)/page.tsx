import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import LifeDashboardView from "@/modules/dashboard/presentation/components/LifeDashboardView";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <LifeDashboardView userId={user.id} />;
}
