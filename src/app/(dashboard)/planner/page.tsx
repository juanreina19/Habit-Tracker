import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import PlannerView from "@/modules/planner/presentation/components/PlannerView";

export default async function PlannerPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <PlannerView userId={user.id} />;
}
