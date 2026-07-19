"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, subMonths, eachMonthOfInterval } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { StudySession } from "../../domain/entities/StudySession";
import type { Subject } from "../../domain/entities/Subject";

interface Props {
  stats: {
    totalHours: number;
    totalSessions: number;
    streak: number;
    heatmap: { date: string; count: number }[];
  };
  sessions: StudySession[];
  subjects: Subject[];
}

function heatmapColor(count: number): string {
  if (count === 0) return "var(--surface-elevated)";
  if (count === 1) return "#4CAF8240";
  if (count === 2) return "#4CAF8280";
  return "#4CAF82";
}

export function StudyStatsPanel({ stats, sessions, subjects }: Props) {
  const t = useTranslations("studies");
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const recentSessions = sessions.slice(0, 5);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map((month) => {
      const key = format(month, "yyyy-MM");
      const count = sessions.filter((s) => s.startedAt.startsWith(key)).length;
      return { month: format(month, "MMM"), sessions: count };
    });
  }, [sessions]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("stats_hours"), value: stats.totalHours.toFixed(1) },
          { label: t("stats_sessions"), value: stats.totalSessions.toString() },
          { label: t("stats_streak"), value: stats.streak.toString() },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </p>
            <p className="text-[11px] mt-1 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly frequency */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--text-secondary)" }}>
          {t("monthly_frequency")}
        </p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="rounded-lg p-4 glass-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-secondary)" }}>
          {t("activity")}
        </p>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {stats.heatmap.map((day) => (
            <div
              key={day.date}
              className="w-[10px] h-[10px] rounded-[3px]"
              style={{ background: heatmapColor(day.count) }}
              title={`${day.date}: ${day.count}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Less</span>
          {[0, 1, 2, 3].map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-[2px]"
              style={{ background: heatmapColor(level) }}
            />
          ))}
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>More</span>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-lg p-4 glass-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-secondary)" }}>
          {t("recent_sessions")}
        </p>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
            {t("no_sessions")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => {
              const sub = subjectMap.get(session.subjectId);
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: sub?.color ?? "#8888AA" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {sub?.name ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {session.durationMin} min
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {format(new Date(session.startedAt), "dd/MM")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
