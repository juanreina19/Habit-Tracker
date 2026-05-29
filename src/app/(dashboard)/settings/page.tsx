import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import SettingsView from "@/modules/habits/presentation/components/settings/SettingsView";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SettingsView userId={user.id} />;
}
