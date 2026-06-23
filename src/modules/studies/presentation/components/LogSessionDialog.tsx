"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import type { Subject } from "../../domain/entities/Subject";
import type { Topic } from "../../domain/entities/Topic";
import type { LogSessionInput } from "../../domain/entities/StudySession";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  topicsBySubject: Record<string, Topic[]>;
  onLoadTopics: (subjectId: UUID) => void;
  onLog: (input: LogSessionInput) => Promise<unknown>;
}

export function LogSessionDialog({ open, onClose, subjects, topicsBySubject, onLoadTopics, onLog }: Props) {
  const t = useTranslations("studies");
  const [subjectId, setSubjectId] = useState<UUID | "">("");
  const [topicId, setTopicId] = useState<UUID | "">("");
  const [durationMin, setDurationMin] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSubjectId(subjects.length > 0 ? subjects[0].id : "");
      setTopicId("");
      setDurationMin(30);
    }
  }, [open, subjects]);

  useEffect(() => {
    if (subjectId) onLoadTopics(subjectId);
  }, [subjectId, onLoadTopics]);

  const topics = subjectId ? (topicsBySubject[subjectId] ?? []) : [];

  const handleLog = async () => {
    if (!subjectId || durationMin <= 0) return;
    setIsSaving(true);
    try {
      await onLog({
        subjectId,
        topicId: topicId || null,
        durationMin,
        startedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none p-6"
          style={{ background: "var(--surface)" }}
        >
          <Dialog.Title className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
            {t("log_session")}
          </Dialog.Title>

          <div className="flex flex-col gap-4">
            {/* Subject */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                {t("select_subject")}
              </label>
              <select
                value={subjectId}
                onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); }}
                className="w-full rounded-md px-4 py-3 text-sm outline-none appearance-none"
                style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            {topics.length > 0 && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  {t("select_topic")}
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full rounded-md px-4 py-3 text-sm outline-none appearance-none"
                  style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                >
                  <option value="">—</option>
                  {topics.map((tp) => (
                    <option key={tp.id} value={tp.id}>{tp.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                {t("duration_min")}
              </label>
              <input
                type="number"
                min={1}
                max={600}
                value={durationMin}
                onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-md px-4 py-3 text-sm outline-none"
                style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
              style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleLog}
              disabled={isSaving || !subjectId}
              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              {isSaving ? t("saving") : t("log_session")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
