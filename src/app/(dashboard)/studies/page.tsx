import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import StudiesView from "@/modules/studies/presentation/components/StudiesView";

export default async function StudiesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <StudiesView userId={user.id} />;
}
