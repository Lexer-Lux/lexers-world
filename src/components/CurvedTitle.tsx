"use client";

interface CurvedTitleProps {
  visible: boolean;
}

export default function CurvedTitle({ visible }: CurvedTitleProps) {
  return (
    <div
      className={`absolute left-1/2 top-3 z-10 hidden w-[min(86vw,680px)] -translate-x-1/2 pointer-events-none select-none transition-all duration-300 sm:block ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      aria-hidden={!visible}
    >
      <svg viewBox="0 0 680 220" role="presentation" focusable="false">
        <defs>
          <path id="lexer-title-arc" d="M 74 178 A 266 266 0 0 1 606 178" />
        </defs>

        <text
          className="font-mono"
          fill="var(--neon-pink)"
          fontSize="44"
          fontWeight="800"
          letterSpacing="0.24em"
          style={{ textShadow: "var(--glow-pink)" }}
        >
          <textPath href="#lexer-title-arc" startOffset="50%" textAnchor="middle">
            LEXER&apos;S WORLD
          </textPath>
        </text>
      </svg>

      <p className="font-comic comic-caption -mt-6 text-center text-sm">SIGNALS ACROSS THE GRID</p>
      <span
        className="font-comic absolute right-1 top-3 text-xs text-neon-cyan"
        style={{ textShadow: "var(--glow-cyan-sm)", transform: "rotate(8deg)" }}
      >
        ZAP!
      </span>
    </div>
  );
}
