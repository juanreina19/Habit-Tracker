import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/shared/components/ui/BottomNav";
import Sidebar from "@/shared/components/ui/Sidebar";
import { FloatingActions } from "@/shared/components/ui/FloatingActions";
import { GlobalFocusModeActions } from "@/shared/components/ui/GlobalFocusModeActions";
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
      <div className="min-h-screen" style={{ background: "var(--bg)" }}>
        <Sidebar />
        <main
          className="lg:ml-[72px] hide-scrollbar"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
        >
          {children}
        </main>
        <FloatingActions />
        <GlobalFocusModeActions userId={user.id} />
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
