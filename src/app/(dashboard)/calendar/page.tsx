import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import CalendarView from "@/modules/habits/presentation/components/CalendarView";

export default async function CalendarPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <CalendarView userId={user.id} userCreatedAt={user.created_at} />;
}
