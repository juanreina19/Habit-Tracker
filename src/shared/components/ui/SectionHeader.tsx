interface Props {
  label: string;
  count?: number;
}

export function SectionHeader({ label, count }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
    </div>
  );
}
