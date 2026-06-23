"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Topic, CreateTopicInput } from "../../domain/entities/Topic";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  topics: Topic[];
  subjectId: UUID;
  onCreateTopic: (input: CreateTopicInput) => Promise<unknown>;
  onDeleteTopic: (id: UUID, subjectId: UUID) => Promise<void>;
}

export function TopicList({ topics, subjectId, onCreateTopic, onDeleteTopic }: Props) {
  const t = useTranslations("studies");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onCreateTopic({ subjectId, title: trimmed });
      setNewTitle("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {topics.map((topic) => (
        <div
          key={topic.id}
          className="flex items-center gap-2 px-3 py-2 rounded-md group"
          style={{ background: "var(--surface-elevated)" }}
        >
          <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {topic.title}
          </span>
          <button
            type="button"
            onClick={() => onDeleteTopic(topic.id, subjectId)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-sm transition-opacity"
            style={{ color: "#FF5252" }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={t("topic_title")}
          className="flex-1 text-sm px-3 py-2 rounded-md outline-none"
          style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
          disabled={adding}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newTitle.trim()}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-30"
          style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
