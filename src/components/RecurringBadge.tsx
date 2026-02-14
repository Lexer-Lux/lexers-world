"use client";

import { useEffect, useState } from "react";

interface RecurringBadgeProps {
  size?: number;
}

export default function RecurringBadge({ size = 28 }: RecurringBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncHoverCapability = () => setHoverCapable(hoverMedia.matches);
    syncHoverCapability();
    hoverMedia.addEventListener("change", syncHoverCapability);

    return () => hoverMedia.removeEventListener("change", syncHoverCapability);
  }, []);

  const isActive = hoverCapable && isHovered;

  const cx = 50;
  const cy = 50;
  const r = 35;
  const letters = "RECURRING".split("");
  const totalLetters = letters.length;
  const loopDuration = 1.4;
  const startAngle = -122;
  const endAngle = 186;
  const arcSpan = endAngle - startAngle;

  const letterPositions = letters.map((letter, i) => {
    const frac = i / (totalLetters - 1);
    const angleDeg = startAngle + frac * arcSpan;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    return {
      letter,
      x,
      y,
      rotation: angleDeg + 90,
      delay: (i / totalLetters) * loopDuration,
    };
  });

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const sx = cx + r * Math.cos(startRad);
  const sy = cy + r * Math.sin(startRad);
  const ex = cx + r * Math.cos(endRad);
  const ey = cy + r * Math.sin(endRad);
  const largeArc = arcSpan > 180 ? 1 : 0;
  const arcPath = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;

  const tipAngleRad = endRad;
  const tipLen = 8;
  const tipSpread = 0.4;
  const ax1 = ex + tipLen * Math.cos(tipAngleRad - Math.PI + tipSpread);
  const ay1 = ey + tipLen * Math.sin(tipAngleRad - Math.PI + tipSpread);
  const ax2 = ex + tipLen * Math.cos(tipAngleRad - Math.PI - tipSpread);
  const ay2 = ey + tipLen * Math.sin(tipAngleRad - Math.PI - tipSpread);

  return (
    <button
      type="button"
      className="inline-flex cursor-default items-center justify-center rounded-full"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Recurring event"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <circle
          cx={cx}
          cy={cy}
          r="24"
          fill="none"
          stroke="#7d2ba8"
          strokeWidth="2"
          opacity="0.7"
        />

        <path
          d={arcPath}
          pathLength={1}
          fill="none"
          stroke="#ff2d75"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: 1.04,
            strokeDashoffset: isActive ? 0 : 1.04,
            animation: isActive
              ? `recArcSweep ${loopDuration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`
              : "none",
            opacity: isActive ? 1 : 0,
            transition: isActive ? "none" : "opacity 0.25s ease-out",
            filter: isActive ? "drop-shadow(0 0 3px rgba(255, 45, 117, 0.55))" : "none",
          }}
        />

        <path
          d={`M ${ax1} ${ay1} L ${ex} ${ey} L ${ax2} ${ay2}`}
          fill="none"
          stroke="#ff2d75"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: isActive ? `recTipPulse ${loopDuration}s linear infinite` : "none",
            opacity: isActive ? 1 : 0,
            transition: isActive ? "none" : "opacity 0.25s ease-out",
            filter: isActive ? "drop-shadow(0 0 2px rgba(255, 45, 117, 0.5))" : "none",
          }}
        />

        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#00f0ff"
          fontFamily="monospace"
          fontWeight="900"
          fontSize="15"
          style={{
            letterSpacing: "0.08em",
            filter: "drop-shadow(0 0 3px rgba(0, 240, 255, 0.45))",
          }}
        >
          R
        </text>

        {letterPositions.map(({ letter, x, y, rotation, delay }, i) => (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${rotation}, ${x}, ${y})`}
            fill="#ff2d75"
            fontFamily="monospace"
            fontWeight="900"
            fontSize="11"
            style={{
              opacity: isActive ? 1 : 0,
              animation: isActive ? `recLetterOrbit ${loopDuration}s linear infinite` : "none",
              animationDelay: `${delay}s`,
              filter: isActive ? "drop-shadow(0 0 3px rgba(255, 45, 117, 0.5))" : "none",
            }}
          >
            {letter}
          </text>
        ))}
      </svg>
    </button>
  );
}
