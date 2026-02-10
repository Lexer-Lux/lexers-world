"use client";

interface GlobeTitlePlaneProps {
  altitude: number;
  enabled: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function GlobeTitlePlane({ altitude, enabled }: GlobeTitlePlaneProps) {
  if (!enabled) {
    return null;
  }

  const visibility = clamp((altitude - 1.02) / 1.25, 0, 1);
  const scale = 0.74 + visibility * 0.52;
  const topOffset = 58 - visibility * 20;

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2"
      style={{
        top: `${topOffset}px`,
        opacity: visibility,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: "top center",
        transition: "opacity 160ms linear, transform 160ms linear, top 160ms linear",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 560 170" role="presentation" focusable="false" style={{ width: "min(86vw, 620px)", height: "auto" }}>
        <defs>
          <path id="title-arc-plane" d="M 54 148 A 226 226 0 0 1 506 148" />
        </defs>
        <text
          fill="var(--neon-pink)"
          fontSize="38"
          fontWeight="800"
          letterSpacing="0.22em"
          style={{
            fontFamily: "var(--font-azeret-mono), monospace",
            filter: "drop-shadow(0 0 8px rgba(255,45,117,0.55)) drop-shadow(0 0 18px rgba(255,45,117,0.28))",
          }}
        >
          <textPath href="#title-arc-plane" startOffset="50%" textAnchor="middle">
            LEXER&apos;S WORLD
          </textPath>
        </text>
      </svg>
    </div>
  );
}
