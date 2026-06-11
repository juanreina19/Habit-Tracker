"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
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
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-60"
          style={{ background: "var(--surface-elevated)" }}
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Mi cuenta</p>
          <h1 className="text-3xl font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>Perfil</h1>
        </div>
      </div>

      {/* Avatar + name */}
      <motion.div
        className="rounded-[20px] p-6 mb-5 flex items-center gap-4"
        style={{ background: "var(--surface)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0 * 0.05, ease: "easeOut" }}
      >
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
              style={{ background: "var(--border)", color: "var(--text-primary)" }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {fullName && (
            <p className="text-lg font-semibold truncate" style={{ color: "var(--text-primary)" }}>{fullName}</p>
          )}
          <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{email}</p>
        </div>
      </motion.div>

      {/* Global stats */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 1 * 0.05, ease: "easeOut" }}
      >
        <StatCard label="Completados" value={stats ? stats.totalCompleted.toString() : "—"} unit="total" />
        <StatCard label="Mejor racha" value={stats ? stats.bestStreak.toString() : "—"} unit="días" highlight={(stats?.bestStreak ?? 0) >= 7} />
        <StatCard label="Activos" value={stats ? stats.activeHabits.toString() : "—"} unit="hábitos" />
      </motion.div>

      {/* Actions */}
      <motion.div
        className="rounded-[20px] overflow-hidden mb-4"
        style={{ background: "var(--surface)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 2 * 0.05, ease: "easeOut" }}
      >
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full px-5 py-4 flex items-center justify-between transition-opacity active:opacity-60 disabled:opacity-40"
        >
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </span>
          <span style={{ color: "var(--text-secondary)", fontSize: 18 }}>→</span>
        </button>
      </motion.div>

      <motion.div
        className="rounded-[20px] overflow-hidden"
        style={{ background: "var(--surface)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 3 * 0.05, ease: "easeOut" }}
      >
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
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              ¿Seguro? Esta acción eliminará todos tus datos permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-[12px] text-sm font-medium"
                style={{ background: "var(--border)", color: "var(--text-secondary)" }}
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
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, unit, highlight = false }: {
  label: string; value: string; unit: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-[16px] p-3 flex flex-col gap-1" style={{ background: "var(--surface)" }}>
      <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color: highlight ? "var(--accent)" : "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{unit}</p>
    </div>
  );
}
