"use client";

import { LexerEvent } from "@/lib/types";
import FlipDate from "./FlipDate";
import RecurringBadge from "./RecurringBadge";

interface EventDetailViewProps {
  event: LexerEvent;
  onBack: () => void;
  onClose: () => void;
}

export default function EventDetailView({
  event,
  onBack,
  onClose,
}: EventDetailViewProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(5, 5, 15, 0.85)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden
          animate-[fadeScale_0.25s_ease-out]"
        style={{
          background: "rgba(10, 10, 25, 0.95)",
          border: "1px solid rgba(0, 240, 255, 0.25)",
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
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255, 45, 117, 0.2)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm transition-colors hover:opacity-80 cursor-pointer"
            style={{ color: "#b026ff", fontFamily: "monospace" }}
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
            className="w-7 h-7 flex items-center justify-center rounded transition-colors
              hover:bg-white/10 cursor-pointer"
            style={{ color: "#ff2d75" }}
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
        <div className="px-6 py-5">
          {/* Event name */}
          <h1
            className="text-2xl font-black tracking-wide uppercase mb-4 pr-12"
            style={{
              color: "#ff2d75",
              textShadow: "0 0 12px rgba(255, 45, 117, 0.6), 0 0 30px rgba(255, 45, 117, 0.3)",
              fontFamily: "monospace",
            }}
          >
            {event.name}
          </h1>

          {/* Metadata */}
          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "monospace" }}>
              <span style={{ color: "#b026ff" }}>&#9737;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                <FlipDate iso={event.date} />
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "monospace" }}>
              <span style={{ color: "#b026ff" }}>&#9672;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{event.manualLocation}</span>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "monospace" }}>
              <span style={{ color: "#00f0ff" }}>&#9733;</span>
              <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                Lexer coming:{" "}
                <span style={{ color: event.isLexerComing ? "#00f0ff" : "#ff2d75" }}>
                  {event.isLexerComing ? "YES" : "NO"}
                </span>
              </span>
            </div>
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
        <div className="flex justify-end px-6 pb-5">
          <DoorButton inviteUrl={event.inviteUrl} />
        </div>
      </div>
    </div>
  );
}

/** Animated door button that opens on press, links to invite URL */
function DoorButton({ inviteUrl }: { inviteUrl: string }) {
  return (
    <a
      href={inviteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block cursor-pointer"
      style={{ perspective: "800px" }}
    >
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all"
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
          {/* Door frame */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              border: "2px solid rgba(0, 240, 255, 0.5)",
              background: "rgba(0, 240, 255, 0.05)",
            }}
          />
          {/* Door panel — swings open on press */}
          <div
            className="absolute inset-0 rounded-sm transition-transform duration-300 ease-in-out
              group-active:[transform:rotateY(-70deg)]"
            style={{
              transformOrigin: "left center",
              background: "rgba(0, 240, 255, 0.2)",
              border: "2px solid #00f0ff",
              boxShadow: "0 0 8px rgba(0, 240, 255, 0.3)",
            }}
          >
            {/* Door knob */}
            <div
              className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{ background: "#00f0ff", boxShadow: "0 0 4px #00f0ff" }}
            />
          </div>
        </div>

        {/* Label */}
        <span
          className="text-sm font-bold uppercase tracking-wider"
          style={{
            color: "#00f0ff",
            textShadow: "0 0 6px rgba(0, 240, 255, 0.5)",
            fontFamily: "monospace",
          }}
        >
          ENTER
        </span>
      </div>
    </a>
  );
}
