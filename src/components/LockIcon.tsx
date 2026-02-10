"use client";

import { useState } from "react";

export type AuthState = "unauthenticated" | "pending" | "insider";

interface LockIconProps {
  authState: AuthState;
  username?: string;
  detailMessage?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

function normalizeUsername(raw?: string): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim().replace(/^@+/, "");
  return trimmed.length > 0 ? trimmed : null;
}

export default function LockIcon({
  authState,
  username,
  detailMessage,
  onSignIn,
  onSignOut,
}: LockIconProps) {
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);

  const isExpanded = hovered || pinnedOpen;
  const displayUsername = normalizeUsername(username);
  const isOpenLock = authState === "insider" || authState === "pending";

  const modeLabel =
    authState === "insider"
      ? "INSIDER MODE"
      : authState === "pending"
        ? "PENDING MODE"
        : "OUTSIDER MODE";

  const color =
    authState === "insider"
      ? "var(--neon-cyan)"
      : authState === "pending"
        ? "var(--neon-yellow)"
        : "var(--neon-pink)";

  return (
    <div
      className="fixed left-4 top-4 z-[15]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (!pinnedOpen) {
          return;
        }
        setPinnedOpen(false);
      }}
    >
      <div
        className="relative flex items-start overflow-hidden rounded-md border transition-[width,max-height,padding] duration-200"
        style={{
          width: isExpanded ? "min(86vw, 340px)" : "40px",
          maxHeight: isExpanded ? "200px" : "40px",
          paddingTop: isExpanded ? "3px" : "0px",
          paddingBottom: isExpanded ? "3px" : "0px",
          borderColor: color,
          background: "rgba(8, 11, 24, 0.84)",
          boxShadow: `0 0 12px ${color}`,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (authState === "unauthenticated") {
              onSignIn();
              return;
            }

            setPinnedOpen((prev) => !prev);
          }}
          aria-label="Account and access status"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center"
          style={{ color }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            {isOpenLock ? <path d="M7 11V7a5 5 0 0 1 9.9-1" /> : <path d="M7 11V7a5 5 0 0 1 10 0v4" />}
            {authState === "pending" && (
              <text
                x="12"
                y="19"
                textAnchor="middle"
                fill="currentColor"
                stroke="none"
                fontSize="9"
                fontFamily="var(--font-azeret-mono), monospace"
                fontWeight="700"
              >
                ?
              </text>
            )}
          </svg>
        </button>

        <div
          className="min-w-0 px-1.5 py-0.5"
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 120ms linear",
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        >
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] leading-tight" style={{ color }}>
            {modeLabel}
          </p>

          <p className="mt-0.5 font-mono text-[9px] leading-tight" style={{ color: "var(--copy-secondary)" }}>
            {detailMessage}
          </p>

          <div className="mt-0.5 flex items-center gap-2">
            {displayUsername && (
              <p className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: "var(--copy-muted)" }}>
                @{displayUsername}
              </p>
            )}

            {authState === "unauthenticated" ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSignIn();
                }}
                className="cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]"
                style={{
                  color: "var(--neon-cyan)",
                  borderColor: "var(--border-cyan)",
                  background: "rgba(0, 240, 255, 0.08)",
                }}
              >
                SIGN IN WITH TWITTER
              </button>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPinnedOpen(false);
                  onSignOut();
                }}
                className="cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]"
                style={{
                  color: "var(--neon-pink)",
                  borderColor: "var(--border-pink)",
                  background: "rgba(255, 45, 117, 0.09)",
                }}
              >
                SIGN OUT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
