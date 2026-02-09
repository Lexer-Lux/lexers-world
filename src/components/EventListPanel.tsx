"use client";

import { LexerEvent } from "@/lib/types";
import FlipDate from "./FlipDate";
import RecurringBadge from "./RecurringBadge";

interface EventListPanelProps {
  locationName: string;
  events: LexerEvent[];
  onEventClick: (event: LexerEvent) => void;
  onClose: () => void;
}

export default function EventListPanel({
  locationName,
  events,
  onEventClick,
  onClose,
}: EventListPanelProps) {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md pointer-events-auto
          animate-[slideIn_0.3s_ease-out]"
        style={{
          background: "rgba(10, 10, 20, 0.92)",
          borderLeft: "1px solid rgba(176, 38, 255, 0.4)",
          boxShadow: "-4px 0 30px rgba(176, 38, 255, 0.15)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255, 45, 117, 0.3)" }}
        >
          <h2
            className="text-xl font-bold tracking-wide uppercase"
            style={{
              color: "#ff2d75",
              textShadow: "0 0 8px rgba(255, 45, 117, 0.6)",
              fontFamily: "monospace",
            }}
          >
            {locationName}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors
              hover:bg-white/10 cursor-pointer"
            style={{ color: "#ff2d75" }}
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
        <div className="overflow-y-auto px-4 py-3" style={{ height: "calc(100% - 72px)" }}>
          {events.length === 0 ? (
            <p
              className="text-center py-10 text-sm"
              style={{ color: "rgba(255, 255, 255, 0.4)", fontFamily: "monospace" }}
            >
              No events at this location yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="relative text-left rounded-lg p-4 transition-all cursor-pointer
                    hover:scale-[1.02]"
                  style={{
                    background: "rgba(255, 45, 117, 0.06)",
                    border: "1px solid rgba(255, 45, 117, 0.15)",
                    boxShadow: "0 0 0 rgba(255, 45, 117, 0)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255, 45, 117, 0.4)";
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 45, 117, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255, 45, 117, 0.15)";
                    e.currentTarget.style.boxShadow = "0 0 0 rgba(255, 45, 117, 0)";
                  }}
                >
                  {event.recurrent && (
                    <div className="absolute top-3 right-3">
                      <RecurringBadge />
                    </div>
                  )}
                  <h3
                    className="text-base font-bold mb-1 pr-10"
                    style={{ color: "#00f0ff", fontFamily: "monospace" }}
                  >
                    {event.name}
                  </h3>
                  <p
                    className="text-xs mb-2"
                    style={{ color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}
                  >
                    <FlipDate iso={event.date} />
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {event.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
