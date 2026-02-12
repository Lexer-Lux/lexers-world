"use client";

import { useState } from "react";

interface RecurringBadgeProps {
  size?: number;
}

export default function RecurringBadge({ size = 28 }: RecurringBadgeProps) {
  const [isActive, setIsActive] = useState(false);

  const cx = 50;
  const cy = 50;
  const r = 35;
  const letters = "RECURRING!".split("");
  const totalLetters = letters.length;
  const loopDuration = 1.6;
  const startAngle = -120;
  const endAngle = 180;
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
      className="inline-block cursor-default"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      aria-label="Recurring event"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <path
          d={arcPath}
          pathLength={1}
          fill="none"
          stroke="#b026ff"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: 0,
            animation: isActive ? `recArcErase ${loopDuration}s steps(${totalLetters}, end) infinite` : "none",
            opacity: 1,
          }}
        />

        <path
          d={`M ${ax1} ${ay1} L ${ex} ${ey} L ${ax2} ${ay2}`}
          fill="none"
          stroke="#b026ff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: isActive ? `recTipFade ${loopDuration}s linear infinite` : "none",
            opacity: 1,
          }}
        />

        {letterPositions.map(({ letter, x, y, rotation, delay }, i) => (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${rotation}, ${x}, ${y})`}
            fill="#b026ff"
            fontFamily="monospace"
            fontWeight="900"
            fontSize="13"
            style={{
              opacity: isActive ? 0 : 0,
              animation: isActive ? `recLetterReveal ${loopDuration}s linear infinite` : "none",
              animationDelay: `${delay}s`,
              filter: "drop-shadow(0 0 3px rgba(176, 38, 255, 0.6))",
            }}
          >
            {letter}
          </text>
        ))}
      </svg>
    </button>
  );
}
