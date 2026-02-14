"use client";

import { useEffect, useMemo, useState } from "react";
import { LexerEvent } from "@/lib/types";
import { formatCost } from "@/lib/data";
import { LEXER_TWITTER_URL } from "@/lib/app-config";
import FlipDate from "./FlipDate";
import LexerPresenceIcon from "./LexerPresenceIcon";
import RecurringBadge from "./RecurringBadge";

interface EventListPanelProps {
  locationName: string;
  events: LexerEvent[];
  onEventClick: (event: LexerEvent) => void;
  onClose: () => void;
  twitterUrl?: string;
}

export default function EventListPanel({
  locationName,
  events,
  onEventClick,
  onClose,
  twitterUrl = LEXER_TWITTER_URL,
}: EventListPanelProps) {
  const [layoutMode, setLayoutMode] = useState<"top" | "right">("top");

  useEffect(() => {
    const updateLayoutMode = () => {
      setLayoutMode(window.innerWidth >= window.innerHeight ? "top" : "right");
    };

    updateLayoutMode();
    window.addEventListener("resize", updateLayoutMode);
    return () => window.removeEventListener("resize", updateLayoutMode);
  }, []);

  const panelClassName = useMemo(() => {
    if (layoutMode === "top") {
      return "panel-shell benday-overlay scanline motion-lines absolute inset-x-0 top-0 h-[44vh] max-h-[430px] rounded-b-2xl pointer-events-auto overflow-hidden animate-[slideDown_0.3s_ease-out]";
    }

    return "panel-shell benday-overlay scanline motion-lines absolute inset-y-0 right-0 h-full w-[min(92vw,360px)] rounded-l-2xl pointer-events-auto overflow-hidden animate-[slideIn_0.3s_ease-out]";
  }, [layoutMode]);

  const eventListClassName =
    layoutMode === "top"
      ? "flex h-full snap-x snap-mandatory flex-row gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1"
      : "flex flex-col gap-3 pb-1";

  const listViewportClassName =
    layoutMode === "top"
      ? "relative z-[2] flex-1 overflow-x-hidden overflow-y-hidden px-3 py-3 sm:px-4"
      : "relative z-[2] flex-1 overflow-y-auto px-3 py-3 sm:px-4";

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
        style={{ background: "rgba(2, 4, 12, 0.38)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={panelClassName}
        style={{
          borderRight: layoutMode === "right" ? "1px solid var(--border-purple)" : "none",
          borderTop: "1px solid var(--border-purple)",
        }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className="relative z-[2] flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
            style={{ borderBottom: "1px solid var(--border-pink)" }}
          >
            <div>
              <h2
                className="font-mono text-lg font-bold uppercase tracking-[0.14em] text-neon-pink sm:text-xl"
                style={{ textShadow: "var(--glow-pink-sm)" }}
              >
                {locationName}
              </h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--copy-muted)" }}>
                {events.length} incoming signal{events.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close event list"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/10"
              style={{ color: "var(--neon-pink)" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4 4l10 10M14 4L4 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Event list */}
          <div className={listViewportClassName}>
            {events.length === 0 ? (
              <p className="py-10 text-center font-mono text-sm" style={{ color: "rgba(255, 255, 255, 0.55)" }}>
                nothing&apos;s here :( know about an event i might enjoy?{" "}
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                  style={{ color: "var(--neon-cyan)" }}
                >
                  hit me up
                </a>
                !
              </p>
            ) : (
              <div className={eventListClassName}>
                {events.map((event, index) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`group/card benday-dense relative cursor-pointer rounded-lg p-3 text-left transition-all ${
                      layoutMode === "top" ? "snap-start" : ""
                    } hover:scale-[1.015] hover:-translate-y-[1px] active:scale-[0.99] sm:p-4`}
                    style={{
                      background: "linear-gradient(145deg, rgba(255, 45, 117, 0.09), rgba(176, 38, 255, 0.08))",
                      border: "1px solid rgba(255, 45, 117, 0.2)",
                      animation: `staggerUp 0.3s ease-out ${index * 0.06}s both`,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                      minWidth: layoutMode === "top" ? "min(86vw, 330px)" : "unset",
                    }}
                    data-layout={layoutMode}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 45, 117, 0.45)";
                      e.currentTarget.style.boxShadow =
                        "0 0 18px rgba(255, 45, 117, 0.14), inset 0 0 28px rgba(255, 45, 117, 0.07)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 45, 117, 0.2)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {event.recurrent && (
                      <div className="absolute right-3 top-3">
                        <RecurringBadge />
                      </div>
                    )}
                    <div className="mb-1 flex items-center gap-2 pr-12">
                      {event.isLexerComing === true && <LexerPresenceIcon size={16} />}
                      <h3 className="font-mono text-sm font-bold text-neon-cyan sm:text-base">{event.name}</h3>
                    </div>
                    <div
                      className="mb-2 flex items-center gap-3 font-mono text-xs"
                      style={{ color: "rgba(255, 255, 255, 0.56)" }}
                    >
                      <FlipDate iso={event.date} />
                      <span style={{ color: event.cost === 0 ? "var(--neon-cyan)" : "var(--neon-pink)" }}>
                        {formatCost(event.cost, event.currency, event.hasAdditionalTiers)}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "rgba(255, 255, 255, 0.78)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {event.description}
                    </p>
                    {/* Comic action arrow — appears on hover */}
                    <div
                      className="absolute bottom-3 right-3 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
                      style={{ color: "var(--neon-pink)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8h8M8 4l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
