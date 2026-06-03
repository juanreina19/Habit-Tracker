import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileView from "@/modules/profile/presentation/components/ProfileView";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const fullName: string = meta.full_name ?? meta.name ?? "";
  const avatarUrl: string = meta.avatar_url ?? "";

  return (
    <ProfileView
      userId={user.id}
      email={user.email ?? ""}
      fullName={fullName}
      avatarUrl={avatarUrl}
    />
  );
}
