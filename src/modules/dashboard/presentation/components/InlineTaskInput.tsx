"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";

interface Props {
  onCreateTask: (title: string) => void;
  placeholder?: string;
}

export function InlineTaskInput({ onCreateTask, placeholder = "Agregar tarea..." }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCreateTask(trimmed);
    setValue("");
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3"
      style={{ background: "var(--surface)" }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: "var(--text-primary)" }}
      />
    </div>
  );
}
