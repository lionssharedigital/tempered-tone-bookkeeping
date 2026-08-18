"use client";

import { useBranding } from "@/components/SettingsProvider";

export default function Logo({
  collapsed = false,
  textColor = "var(--sidebar-text)",
}: {
  collapsed?: boolean;
  textColor?: string;
}) {
  const { logoDataUri } = useBranding();

  return (
    <div className="flex items-center gap-2.5">
      {logoDataUri ? (
        // Custom uploaded logo is a data: URI -- next/image's optimizer
        // doesn't handle those, so this renders as a plain <img>.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoDataUri} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
      ) : (
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
      )}
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
