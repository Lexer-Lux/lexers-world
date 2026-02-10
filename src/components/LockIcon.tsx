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

  const color =
    authState === "insider"
      ? "var(--neon-cyan)"
      : authState === "pending"
        ? "var(--neon-yellow)"
        : "var(--neon-pink)";

  const glow =
    authState === "insider"
      ? "var(--glow-cyan-sm)"
      : authState === "pending"
      ? "0 0 8px rgba(255, 225, 86, 0.6)"
      : "var(--glow-pink-sm)";

  const isOpen = authState === "insider" || authState === "pending";
  const isExpanded = hovered || pinnedOpen;

  const statusLabel =
    authState === "insider"
      ? "Insider unlocked"
      : authState === "pending"
        ? "Awaiting approval"
        : "Outsider mode";

  const subtitle =
    authState === "insider"
      ? displayUsername
        ? `@${displayUsername}`
        : "Approved"
      : authState === "pending"
        ? displayUsername
          ? `Signed in as @${displayUsername}`
          : "Signed in"
        : "Sign in with X";

  const bodyText = detailMessage ?? "Sign in with X to request insider approval.";

  return (
    <div
      className="fixed top-4 left-4 z-40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPinnedOpen(false);
      }}
    >
      <div
        className="panel-shell benday-overlay relative flex items-center gap-2 transition-all duration-300 ease-out"
        style={{
          borderColor: color,
          borderRadius: "10px",
          padding: "8px",
          boxShadow: glow,
          cursor: "pointer",
          maxWidth: isExpanded ? "340px" : "42px",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        onClick={() => {
          if (authState === "unauthenticated") {
            onSignIn();
            return;
          }

          setPinnedOpen((open) => !open);
        }}
      >
        <div
          className="relative flex h-[26px] w-[26px] items-center justify-center rounded"
          style={{
            border: `1px solid ${color}`,
            background: "rgba(4, 6, 16, 0.62)",
            boxShadow: `inset 0 0 10px rgba(0, 0, 0, 0.35), ${glow}`,
            flexShrink: 0,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "all 0.3s ease" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            {isOpen ? <path d="M7 11V7a5 5 0 0 1 9.9-1" /> : <path d="M7 11V7a5 5 0 0 1 10 0v4" />}
            {authState === "pending" && (
              <text
                x="12"
                y="19"
                textAnchor="middle"
                fill={color}
                stroke="none"
                fontSize="9"
                fontFamily="var(--font-azeret-mono), monospace"
                fontWeight="700"
              >
                ?
              </text>
            )}
          </svg>
        </div>

        <div
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 0.2s ease 0.1s",
            display: "grid",
            gap: "6px",
            minWidth: "250px",
            whiteSpace: "normal",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color }}>
              {statusLabel}
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 8px ${color}`,
                flexShrink: 0,
              }}
            />
          </div>

          <p className="font-mono text-[11px] leading-tight" style={{ color: "var(--copy-primary)" }}>
            {subtitle}
          </p>

          <p className="font-mono text-[10px] leading-tight" style={{ color: "var(--copy-secondary)" }}>
            {bodyText}
          </p>

          <div className="mt-1 flex items-center gap-2">
            {authState === "unauthenticated" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSignIn();
                }}
                className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-colors duration-200 cursor-pointer"
                style={{
                  color: "var(--neon-cyan)",
                  border: "1px solid var(--border-cyan)",
                  background: "rgba(0, 240, 255, 0.08)",
                }}
              >
                Sign in with X
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedOpen(false);
                  onSignOut();
                }}
                className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-colors duration-200 cursor-pointer"
                style={{
                  color: "var(--neon-pink)",
                  border: "1px solid var(--border-pink)",
                  background: "rgba(255, 45, 117, 0.09)",
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
