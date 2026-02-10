"use client";

import { useState } from "react";
import { LexerEvent, ViewerMode } from "@/lib/types";
import { formatCost } from "@/lib/data";
import FlipDate from "./FlipDate";
import RecurringBadge from "./RecurringBadge";

interface EventDetailViewProps {
  event: LexerEvent;
  viewerMode: ViewerMode;
  onBack: () => void;
  onClose: () => void;
}

export default function EventDetailView({
  event,
  viewerMode,
  onBack,
  onClose,
}: EventDetailViewProps) {
  const isOutsider = viewerMode === "outsider";
  const lexerComingLabel =
    event.isLexerComing === "?" ? "?" : event.isLexerComing ? "YES" : "NO";
  const lexerComingColor =
    event.isLexerComing === "?"
      ? "var(--neon-yellow)"
      : event.isLexerComing
        ? "var(--neon-cyan)"
        : "var(--neon-pink)";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[fadeIn_0.2s_ease-out]"
        style={{ background: "var(--surface-overlay)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="benday-overlay benday-cyan scanline relative w-full max-w-lg rounded-xl overflow-hidden
          animate-[fadeScale_0.25s_ease-out]"
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-cyan)",
          boxShadow:
            "0 0 40px rgba(176, 38, 255, 0.15), 0 0 80px rgba(255, 45, 117, 0.08)",
        }}
      >
        {/* Recurring badge — top right of card */}
        {event.recurrent && (
          <div className="absolute top-3 right-3 z-10">
            <RecurringBadge size={32} />
          </div>
        )}

        {/* Top bar */}
        <div
          className="relative z-[2] flex items-center justify-between px-4 sm:px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255, 45, 117, 0.2)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm transition-colors hover:opacity-80 cursor-pointer
              min-h-[44px] sm:min-h-0"
            style={{ color: "var(--neon-purple)", fontFamily: "monospace" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            BACK
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center rounded transition-colors
              hover:bg-white/10 cursor-pointer"
            style={{ color: "var(--neon-pink)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="relative z-[2] px-4 sm:px-6 py-4 sm:py-5">
          {/* Event name */}
          <h1
            className="text-xl sm:text-2xl font-black tracking-wide uppercase mb-4 pr-12 font-mono text-neon-pink"
            style={{
              textShadow: "0 0 12px rgba(255, 45, 117, 0.6), 0 0 30px rgba(255, 45, 117, 0.3)",
            }}
          >
            {event.name}
          </h1>

          {/* Metadata */}
          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-neon-purple">&#9737;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                <FlipDate iso={event.date} />
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-neon-purple">&#9672;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{event.manualLocation}</span>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-neon-purple">&#8962;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                {isOutsider ? (
                  <span className="glitch-redact">[ LOCATION BLACKBOXED ]</span>
                ) : (
                  event.address
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-neon-cyan">&#9830;</span>
              <span style={{ color: event.cost === 0 ? "var(--neon-cyan)" : "rgba(255, 255, 255, 0.7)" }}>
                {formatCost(event.cost, event.currency, event.hasAdditionalTiers)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-neon-cyan">&#9733;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                Lexer coming:{" "}
                <span style={{ color: lexerComingColor }}>
                  {lexerComingLabel}
                </span>
              </span>
            </div>

            {event.locationPrecision === "fuzzed" && (
              <p
                className="text-xs uppercase tracking-wide font-mono"
                style={{ color: "rgba(255, 225, 86, 0.85)" }}
              >
                outsider coordinates are deterministic privacy fuzzes
              </p>
            )}
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "rgba(255, 255, 255, 0.8)" }}
          >
            {event.description}
          </p>
        </div>

        {/* Door button — bottom right */}
        <div className="relative z-[2] flex justify-end px-4 sm:px-6 pb-5">
          <DoorButton inviteUrl={event.inviteUrl} />
        </div>
      </div>
    </div>
  );
}

/** Animated door button — enhanced with light spill and glow */
function DoorButton({ inviteUrl }: { inviteUrl: string }) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <a
      href={inviteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group/door relative block cursor-pointer burst-lines"
      style={{ perspective: "800px" }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 sm:py-2 rounded-lg transition-all duration-200
          hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
        style={{
          border: "1px solid rgba(0, 240, 255, 0.3)",
          background: "rgba(0, 240, 255, 0.05)",
        }}
      >
        {/* Door icon container */}
        <div
          className="relative w-8 h-10"
          style={{ perspective: "800px" }}
        >
          {/* Light behind door — visible when open */}
          <div
            className="absolute inset-0 rounded-sm transition-opacity duration-300"
            style={{
              opacity: isPressed ? 1 : 0,
              background: "radial-gradient(ellipse at center, rgba(0, 240, 255, 0.3), rgba(255, 225, 86, 0.15), transparent)",
              boxShadow: isPressed ? "0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(255, 225, 86, 0.1)" : "none",
            }}
          />

          {/* Door frame */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              border: "2px solid rgba(0, 240, 255, 0.5)",
              background: "rgba(0, 240, 255, 0.05)",
            }}
          />
          {/* Door panel — swings open on press with spring easing */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              transformOrigin: "left center",
              background: "rgba(0, 240, 255, 0.2)",
              border: "2px solid var(--neon-cyan)",
              boxShadow: isPressed
                ? "-5px 0 15px rgba(0, 240, 255, 0.4)"
                : "0 0 8px rgba(0, 240, 255, 0.3)",
              transform: isPressed ? "rotateY(-75deg)" : "rotateY(0deg)",
              transition: isPressed
                ? "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease"
                : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
            }}
          >
            {/* Door knob */}
            <div
              className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                background: "var(--neon-cyan)",
                boxShadow: "0 0 4px var(--neon-cyan)",
              }}
            />
          </div>
        </div>

        {/* Label */}
        <span
          className="text-sm font-bold uppercase tracking-wider font-mono text-neon-cyan"
          style={{
            textShadow: "var(--glow-cyan-sm)",
          }}
        >
          ENTER
        </span>

        {/* Comic "KNOCK KNOCK" hint on hover */}
        <span
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest font-mono
            opacity-0 group-hover/door:opacity-100 transition-all duration-300
            group-hover/door:-translate-y-1"
          style={{
            color: "var(--neon-yellow)",
            textShadow: "0 0 6px rgba(255, 225, 86, 0.5)",
            transform: "translateX(-50%)",
          }}
        >
          KNOCK KNOCK
        </span>
      </div>
    </a>
  );
}
