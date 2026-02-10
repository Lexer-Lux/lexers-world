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

  const displayUsername = normalizeUsername(username);
  const isOpen = authState === "insider" || authState === "pending";
  const isExpanded = hovered || pinnedOpen;

  const color =
    authState === "insider"
      ? "var(--neon-cyan)"
      : authState === "pending"
      ? "var(--neon-yellow)"
      : "var(--neon-pink)";

  const statusLabel =
    authState === "insider"
      ? displayUsername
        ? `@${displayUsername}`
        : "insider"
      : authState === "pending"
      ? "awaiting approval"
      : "outsider";

  const message = detailMessage ?? "Sign in with X to request insider approval.";

  return (
    <div
      className="fixed left-4 top-4 z-40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (!pinnedOpen) {
          return;
        }
        setPinnedOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (authState === "unauthenticated") {
            onSignIn();
            return;
          }

          setPinnedOpen((open) => !open);
        }}
        aria-label="Open auth status"
        className="relative grid h-10 w-10 place-items-center rounded-md border transition-colors"
        style={{
          color,
          borderColor: color,
          background: "rgba(4, 6, 16, 0.72)",
          boxShadow: `0 0 12px ${color}`,
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          {isOpen ? <path d="M7 11V7a5 5 0 0 1 9.9-1" /> : <path d="M7 11V7a5 5 0 0 1 10 0v4" />}
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
        className="pointer-events-none absolute left-12 top-0 w-[min(78vw,280px)] rounded-md border p-2 transition-all duration-200"
        style={{
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? "translateX(0)" : "translateX(-6px)",
          borderColor: color,
          background: "rgba(8, 11, 24, 0.9)",
          boxShadow: "0 0 18px rgba(0, 0, 0, 0.38)",
          pointerEvents: isExpanded ? "auto" : "none",
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
          {statusLabel}
        </p>
        <p className="mt-1 font-mono text-[10px] leading-tight" style={{ color: "var(--copy-secondary)" }}>
          {message}
        </p>

        <div className="mt-2 flex items-center gap-2">
          {authState === "unauthenticated" ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSignIn();
              }}
              className="cursor-pointer rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{
                color: "var(--neon-cyan)",
                borderColor: "var(--border-cyan)",
                background: "rgba(0, 240, 255, 0.08)",
              }}
            >
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPinnedOpen(false);
                onSignOut();
              }}
              className="cursor-pointer rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{
                color: "var(--neon-pink)",
                borderColor: "var(--border-pink)",
                background: "rgba(255, 45, 117, 0.09)",
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
