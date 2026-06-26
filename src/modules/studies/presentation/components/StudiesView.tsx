"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStudies } from "../hooks/useStudies";
import { SubjectCard } from "./SubjectCard";
import { SubjectFormDialog } from "./SubjectFormDialog";
import { LogSessionDialog } from "./LogSessionDialog";
import { StudyStatsPanel } from "./StudyStatsPanel";
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from "../../domain/entities/Subject";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StudiesView({ userId }: Props) {
  const t = useTranslations("studies");
  const studies = useStudies(userId);

  const [subjectDialog, setSubjectDialog] = useState<{ open: boolean; subject: Subject | null }>({
    open: false, subject: null,
  });
  const [logDialog, setLogDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);

  const todayDow = new Date().getDay();
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1;

  const handleSaveSubject = async (data: CreateSubjectInput | UpdateSubjectInput) => {
    if (subjectDialog.subject) {
      await studies.updateSubject(subjectDialog.subject.id, data as UpdateSubjectInput);
    } else {
      await studies.createSubject(data as CreateSubjectInput);
    }
  };

  const handleDeleteSubject = async () => {
    if (!confirmDelete) return;
    await studies.deleteSubject(confirmDelete.id);
    setConfirmDelete(null);
  };

  if (studies.isLoading) return <StudiesSkeleton />;

  return (
    <>
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-medium" style={{ color: "var(--text-primary)" }}>
              {t("title")}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLogDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
              style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
            >
              <Clock size={14} />
              <span className="hidden lg:inline">{t("log_session")}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubjectDialog({ open: true, subject: null })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden lg:inline">{t("add_subject")}</span>
            </button>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 mt-6">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Schedule week */}
            <div className="rounded-lg p-4" style={{ background: "var(--surface)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-secondary)" }}>
                {t("schedule")}
              </p>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg transition-colors"
                    style={{
                      background: i === todayIdx ? "var(--btn-primary-bg)" : "transparent",
                      color: i === todayIdx ? "var(--btn-primary-text)" : "var(--text-secondary)",
                    }}
                  >
                    <span className={`text-sm ${i === todayIdx ? "font-semibold" : "font-medium"}`}>{day}</span>
                    {i === todayIdx && (
                      <span className="text-[10px] font-medium">Today</span>
                    )}
                    {i !== todayIdx && (
                      <span className="w-1 h-1 rounded-full" style={{ background: "var(--text-muted)", opacity: 0.3 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Subjects */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-secondary)" }}>
                {t("subjects")}
              </p>

              {studies.subjects.length === 0 ? (
                <div className="rounded-xl p-10 text-center" style={{ background: "var(--surface)" }}>
                  <p className="text-4xl mb-3">📚</p>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{t("no_subjects")}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("no_subjects_hint")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {studies.subjects.map((subject, index) => (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                    >
                      <SubjectCard
                        subject={subject}
                        topics={studies.topicsBySubject[subject.id] ?? []}
                        onLoadTopics={studies.loadTopics}
                        onCreateTopic={studies.createTopic}
                        onDeleteTopic={studies.deleteTopic}
                        onEdit={() => setSubjectDialog({ open: true, subject })}
                        onDelete={() => setConfirmDelete(subject)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — stats */}
          <div className="mt-6 lg:mt-0">
            <StudyStatsPanel
              stats={studies.stats}
              sessions={studies.sessions}
              subjects={studies.subjects}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SubjectFormDialog
        open={subjectDialog.open}
        onClose={() => setSubjectDialog({ open: false, subject: null })}
        subject={subjectDialog.subject}
        onSave={handleSaveSubject}
      />

      <LogSessionDialog
        open={logDialog}
        onClose={() => setLogDialog(false)}
        subjects={studies.subjects}
        topicsBySubject={studies.topicsBySubject}
        onLoadTopics={studies.loadTopics}
        onLog={studies.logSession}
      />

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {t("delete")}
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {t("delete_subject_confirm")}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-lg text-sm font-medium"
                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteSubject}
                className="flex-1 py-3 rounded-lg text-sm font-semibold"
                style={{ background: "var(--danger)", color: "#FFFFFF" }}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StudiesSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10 skeleton-shimmer">
      <div className="h-7 w-32 rounded-lg mb-2" style={{ background: "var(--surface)" }} />
      <div className="h-4 w-64 rounded-lg mb-6" style={{ background: "var(--surface)" }} />
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        <div className="flex flex-col gap-3">
          <div className="h-20 rounded-lg" style={{ background: "var(--surface)" }} />
          <div className="h-16 rounded-lg" style={{ background: "var(--surface)" }} />
          <div className="h-16 rounded-lg" style={{ background: "var(--surface)" }} />
        </div>
        <div className="flex flex-col gap-3 mt-6 lg:mt-0">
          <div className="h-24 rounded-lg" style={{ background: "var(--surface)" }} />
          <div className="h-40 rounded-lg" style={{ background: "var(--surface)" }} />
        </div>
      </div>
    </div>
  );
}
