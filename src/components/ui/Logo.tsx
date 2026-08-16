export default function Logo({
  collapsed = false,
  textColor = "var(--sidebar-text)",
}: {
  collapsed?: boolean;
  textColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="9" fill="var(--accent)" />
        <text
          x="16"
          y="21.5"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="13"
          fill="#fff"
        >
          TT
        </text>
      </svg>
      {!collapsed && (
        <span
          className="font-display text-[15px] leading-tight font-semibold tracking-tight"
          style={{ color: textColor }}
        >
          Tempered Tone Woods
          <span className="block text-[11px] font-medium tracking-wide opacity-60">
            Bookkeeping
          </span>
        </span>
      )}
    </div>
  );
}
