"use client";

import { useState } from "react";

interface FlipDateProps {
  iso: string;
  className?: string;
}

function toIsoDisplay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function toHumanDisplay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FlipDate({ iso, className = "" }: FlipDateProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      className={`group/flip inline-block cursor-pointer ${className}`}
      style={{ perspective: "300px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((value) => !value)}
      aria-label="Toggle date format"
    >
      <span
        className="relative inline-block transition-transform duration-300 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          whiteSpace: "nowrap",
          transform: flipped ? "rotateX(180deg)" : "rotateX(0deg)",
        }}
      >
        <span className="inline-block" style={{ backfaceVisibility: "hidden" }}>
          {toIsoDisplay(iso)}
        </span>
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
    </button>
  );
}
