import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import TodayView from "@/modules/habits/presentation/components/TodayView";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const rawName: string =
    meta.given_name ?? meta.full_name ?? meta.name ?? user.email ?? "";
  const firstName = rawName.split(" ")[0] ?? "";

  return <TodayView userId={user.id} userName={firstName} />;
}
