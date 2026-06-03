"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/shared/lib/supabase/client";
import type { UUID, DbStreak } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  email: string;
  fullName: string;
  avatarUrl: string;
}

interface ProfileStats {
  totalCompleted: number;
  bestStreak: number;
  activeHabits: number;
}

export default function ProfileView({ userId, email, fullName, avatarUrl }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      const client = createClient();
      const [logsRes, streaksRes, habitsRes] = await Promise.all([
        client.from("habit_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client.from("streaks").select("*").eq("user_id", userId),
        client.from("habits").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
      ]);
      const bestStreak = Math.max(0, ...((streaksRes.data ?? []) as DbStreak[]).map((s) => s.best_streak));
      setStats({
        totalCompleted: logsRes.count ?? 0,
        bestStreak,
        activeHabits: habitsRes.count ?? 0,
      });
    };
    load();
  }, [userId]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const client = createClient();
    await client.auth.signOut();
    router.push("/login");
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : email[0]?.toUpperCase() ?? "?";

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium" style={{ color: "#8888AA" }}>Mi cuenta</p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "#FFFFFF" }}>Perfil</h1>
      </div>

      {/* Avatar + name */}
      <div className="rounded-[20px] p-6 mb-5 flex items-center gap-4" style={{ background: "#111111" }}>
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName || email}
              width={64}
              height={64}
              className="rounded-full"
              unoptimized
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: "#2A2A2A", color: "#FFFFFF" }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {fullName && (
            <p className="text-lg font-semibold truncate" style={{ color: "#FFFFFF" }}>{fullName}</p>
          )}
          <p className="text-sm truncate" style={{ color: "#8888AA" }}>{email}</p>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Completados" value={stats ? stats.totalCompleted.toString() : "—"} unit="total" />
        <StatCard label="Mejor racha" value={stats ? stats.bestStreak.toString() : "—"} unit="días" highlight={(stats?.bestStreak ?? 0) >= 7} />
        <StatCard label="Activos" value={stats ? stats.activeHabits.toString() : "—"} unit="hábitos" />
      </div>

      {/* Actions */}
      <div className="rounded-[20px] overflow-hidden mb-4" style={{ background: "#111111" }}>
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full px-5 py-4 flex items-center justify-between transition-opacity active:opacity-60 disabled:opacity-40"
        >
          <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>
            {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </span>
          <span style={{ color: "#8888AA", fontSize: 18 }}>→</span>
        </button>
      </div>

      <div className="rounded-[20px] overflow-hidden" style={{ background: "#111111" }}>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-5 py-4 flex items-center justify-between transition-opacity active:opacity-60"
          >
            <span className="text-sm font-medium" style={{ color: "#FF5252" }}>Eliminar cuenta</span>
            <span style={{ color: "#FF5252", fontSize: 18 }}>→</span>
          </button>
        ) : (
          <div className="px-5 py-4">
            <p className="text-sm mb-4" style={{ color: "#8888AA" }}>
              ¿Seguro? Esta acción eliminará todos tus datos permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-[12px] text-sm font-medium"
                style={{ background: "#2A2A2A", color: "#8888AA" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-[12px] text-sm font-medium"
                style={{ background: "rgba(255,82,82,0.15)", color: "#FF5252" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, highlight = false }: {
  label: string; value: string; unit: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-[16px] p-3 flex flex-col gap-1" style={{ background: "#111111" }}>
      <p className="text-[10px] font-medium" style={{ color: "#8888AA" }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: highlight ? "#4CAF82" : "#FFFFFF" }}>
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "#555555" }}>{unit}</p>
    </div>
  );
}
