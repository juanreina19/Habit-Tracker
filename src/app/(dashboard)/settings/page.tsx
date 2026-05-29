import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import SettingsView from "@/modules/habits/presentation/components/settings/SettingsView";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <SettingsView userId={user!.id} />;
}
