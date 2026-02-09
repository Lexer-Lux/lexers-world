"use client";

interface RecurringBadgeProps {
  size?: number;
}

/**
 * Cycle arrow icon that on hover reveals "RECURRING!" lettered along the arc.
 * The arrow line fades segment by segment, replaced by each letter.
 * Animation loops on hover.
 */
export default function RecurringBadge({ size = 28 }: RecurringBadgeProps) {
  // The circular arc path — goes ~300 degrees around
  // Center at 50,50, radius 35, from ~30deg to ~330deg (clockwise)
  const cx = 50, cy = 50, r = 35;
  const letters = "RECURRING!".split("");
  const totalLetters = letters.length;

  // Arc spans from startAngle to endAngle (degrees, 0 = right, clockwise)
  const startAngle = -120; // top-left
  const endAngle = 180;   // bottom-left (300 degree arc)
  const arcSpan = endAngle - startAngle;

  // Position each letter along the arc
  const letterPositions = letters.map((letter, i) => {
    const frac = i / (totalLetters - 1);
    const angleDeg = startAngle + frac * arcSpan;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    // Rotation: tangent to circle + 90deg so letters read outward
    const rotation = angleDeg + 90;
    return { letter, x, y, rotation, delay: i * 0.08 };
  });

  // SVG arc path for the arrow line (same arc as letters)
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const sx = cx + r * Math.cos(startRad);
  const sy = cy + r * Math.sin(startRad);
  const ex = cx + r * Math.cos(endRad);
  const ey = cy + r * Math.sin(endRad);
  const largeArc = arcSpan > 180 ? 1 : 0;
  const arcPath = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;

  // Arrow tip at the end of the arc
  const tipAngleRad = endRad;
  const tipLen = 8;
  const tipSpread = 0.4;
  const ax1 = ex + tipLen * Math.cos(tipAngleRad - Math.PI + tipSpread);
  const ay1 = ey + tipLen * Math.sin(tipAngleRad - Math.PI + tipSpread);
  const ax2 = ex + tipLen * Math.cos(tipAngleRad - Math.PI - tipSpread);
  const ay2 = ey + tipLen * Math.sin(tipAngleRad - Math.PI - tipSpread);

  // Approximate arc length for stroke-dasharray
  const arcLength = (arcSpan / 360) * 2 * Math.PI * r;

  return (
    <div
      className="group/rec inline-block cursor-default"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="overflow-visible"
      >
        {/* Arrow arc line — fades out on hover */}
        <path
          d={arcPath}
          fill="none"
          stroke="#b026ff"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-opacity duration-500 group-hover/rec:opacity-0"
          style={{ strokeDasharray: arcLength, strokeDashoffset: 0 }}
        />
        {/* Arrow tip — fades out on hover */}
        <path
          d={`M ${ax1} ${ay1} L ${ex} ${ey} L ${ax2} ${ay2}`}
          fill="none"
          stroke="#b026ff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-opacity duration-500 group-hover/rec:opacity-0"
        />

        {/* Letters along the arc — fade in on hover */}
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
            className="opacity-0 transition-opacity group-hover/rec:opacity-100"
            style={{
              transitionDelay: `${delay}s`,
              transitionDuration: "0.15s",
              filter: "drop-shadow(0 0 3px rgba(176, 38, 255, 0.6))",
            }}
          >
            {letter}
          </text>
        ))}
      </svg>
    </div>
  );
}
