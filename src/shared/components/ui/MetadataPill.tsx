interface Props {
  prefix?: string;
  value: string;
  dotColor?: string;
  active?: boolean;
  onClick?: () => void;
}

export function MetadataPill({ prefix, value, dotColor, active, onClick }: Props) {
  const Component = onClick ? "button" : "span";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors"
      style={{
        background: active ? "var(--text-primary)" : "var(--surface-elevated)",
        color: active ? "var(--bg)" : "var(--text-secondary)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
      )}
      {prefix && <span className="font-semibold uppercase">{prefix}</span>}
      <span>{value}</span>
    </Component>
  );
}
