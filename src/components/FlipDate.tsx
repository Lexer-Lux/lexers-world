"use client";

interface FlipDateProps {
  iso: string;
  className?: string;
}

function toIsoDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace(".000", ""); // "2026-03-15T20:00:00Z"
}

function toHumanDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FlipDate({ iso, className = "" }: FlipDateProps) {
  return (
    <span
      className={`group/flip inline-block cursor-default ${className}`}
      style={{ perspective: "300px" }}
    >
      <span
        className="relative inline-block transition-transform duration-300 ease-in-out
          group-hover/flip:[transform:rotateX(180deg)]"
        style={{ transformStyle: "preserve-3d", whiteSpace: "nowrap" }}
      >
        {/* Front face — ISO */}
        <span
          className="inline-block"
          style={{ backfaceVisibility: "hidden" }}
        >
          {toIsoDisplay(iso)}
        </span>
        {/* Back face — human-readable */}
        <span
          className="absolute left-0 top-0 inline-block"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateX(180deg)",
          }}
        >
          {toHumanDisplay(iso)}
        </span>
      </span>
    </span>
  );
}
