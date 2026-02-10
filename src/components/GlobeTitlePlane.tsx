"use client";

import { useEffect, useMemo, useState } from "react";

interface GlobeTitlePlaneProps {
  altitude: number;
  enabled: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function GlobeTitlePlane({ altitude, enabled }: GlobeTitlePlaneProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const layout = useMemo(() => {
    const width = viewport.width || 1280;
    const height = viewport.height || 720;
    const base = Math.min(width, height);
    const globeRadius = base * 0.335;

    const rawVisibility = (altitude - 1.01) / 1.32;
    const visibility = clamp(rawVisibility, 0, 1);

    const titleTop = height * 0.5 - globeRadius - 44;
    const scale = 0.7 + visibility * 0.5;

    return {
      top: clamp(titleTop, 18, height * 0.46),
      visibility,
      scale,
    };
  }, [altitude, viewport.height, viewport.width]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2"
      style={{
        top: `${layout.top}px`,
        opacity: layout.visibility,
        transform: `translateX(-50%) scale(${layout.scale})`,
        transformOrigin: "center center",
        transition: "opacity 120ms linear, transform 120ms linear, top 120ms linear",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 560 170"
        role="presentation"
        focusable="false"
        style={{ width: "min(84vw, 600px)", height: "auto" }}
      >
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
            filter:
              "drop-shadow(0 0 8px rgba(255,45,117,0.55)) drop-shadow(0 0 18px rgba(255,45,117,0.28))",
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
