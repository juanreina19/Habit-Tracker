import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/shared/components/ui/BottomNav";
import Sidebar from "@/shared/components/ui/Sidebar";
import { FloatingActions } from "@/shared/components/ui/FloatingActions";
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
          className="lg:ml-[72px]"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
        >
          {children}
        </main>
        <FloatingActions />
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
