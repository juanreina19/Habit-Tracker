import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/shared/components/ui/BottomNav";
import { ToastProvider } from "@/shared/components/ui/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col" style={{ background: "#000000" }}>
        <main className="flex-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)" }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
