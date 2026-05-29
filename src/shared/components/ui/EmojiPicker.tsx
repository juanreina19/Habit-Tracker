"use client";

export const HABIT_EMOJIS = [
  "💪", "🏃", "🧘", "📚", "💧", "🥗", "😴", "🎯",
  "🎨", "💻", "🎵", "🌿", "🏋️", "🧠", "❤️", "✨",
  "🚀", "⭐", "🌙", "☀️", "🎭", "🎮", "🏊", "🚴",
  "📝", "🍎", "💊", "🧹", "🛁", "📱", "🎸", "🌎",
];

interface Props {
  value: string | null;
  onChange: (emoji: string | null) => void;
}

export function EmojiPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {HABIT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(value === emoji ? null : emoji)}
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl transition-all active:scale-90"
          style={{
            background: value === emoji ? "#252540" : "transparent",
            border: `1.5px solid ${value === emoji ? "#FFFFFF30" : "transparent"}`,
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
