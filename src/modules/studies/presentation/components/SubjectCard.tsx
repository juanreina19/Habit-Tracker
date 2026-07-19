"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { Subject } from "../../domain/entities/Subject";
import type { Topic, CreateTopicInput } from "../../domain/entities/Topic";
import { TopicList } from "./TopicList";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  subject: Subject;
  topics: Topic[];
  onLoadTopics: (subjectId: UUID) => void;
  onCreateTopic: (input: CreateTopicInput) => Promise<unknown>;
  onDeleteTopic: (id: UUID, subjectId: UUID) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

export function SubjectCard({ subject, topics, onLoadTopics, onCreateTopic, onDeleteTopic, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = subject.color ?? "#8888AA";

  useEffect(() => {
    if (expanded) onLoadTopics(subject.id);
  }, [expanded, subject.id, onLoadTopics]);

  return (
    <div className="rounded-lg overflow-hidden glass-panel">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div
          className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: accentColor + "25" }}
        >
          {subject.icon ?? "📖"}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {subject.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {topics.length} {topics.length === 1 ? "tema" : "temas"}
          </p>
        </div>

        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accentColor }} />

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="w-8 h-8 rounded-sm flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="w-8 h-8 rounded-sm flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 ml-7">
              <TopicList
                topics={topics}
                subjectId={subject.id}
                onCreateTopic={onCreateTopic}
                onDeleteTopic={onDeleteTopic}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
