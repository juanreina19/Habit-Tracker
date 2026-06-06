import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import TasksView from "@/modules/tasks/presentation/components/TasksView";
import { redirect } from "next/navigation";

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <TasksView userId={user.id} />;
}
