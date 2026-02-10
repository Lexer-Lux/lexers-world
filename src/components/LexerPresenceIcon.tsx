"use client";

interface LexerPresenceIconProps {
  size?: number;
}

export default function LexerPresenceIcon({ size = 18 }: LexerPresenceIconProps) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        border: "1px solid rgba(0, 240, 255, 0.45)",
        background: "rgba(4, 9, 20, 0.8)",
        boxShadow: "0 0 10px rgba(0, 240, 255, 0.22)",
      }}
      title="Lexer is coming"
      aria-label="Lexer is coming"
    >
      <svg width={size - 2} height={size - 2} viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" fill="#9a6a4f" />
        <ellipse cx="11" cy="6.2" rx="7.1" ry="4.1" fill="#1a1a25" />
        <rect x="4.4" y="8.2" width="5.5" height="2.4" rx="1.1" fill="#ff2d75" />
        <rect x="12.1" y="8.2" width="5.5" height="2.4" rx="1.1" fill="#00f0ff" />
        <rect x="9.7" y="8.95" width="2.6" height="0.8" fill="#d6e7ff" />
        <rect x="5.3" y="11.7" width="11.4" height="4.6" rx="2.3" fill="#7ad8f5" />
      </svg>
    </span>
  );
}
