"use client";

import { useState } from "react";

export type AuthState = "unauthenticated" | "pending" | "insider";

interface LockIconProps {
  authState: AuthState;
  username?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export default function LockIcon({ authState, username, onSignIn, onSignOut }: LockIconProps) {
  const [hovered, setHovered] = useState(false);

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

  const statusLabel =
    authState === "insider"
      ? `@${username}`
      : authState === "pending"
        ? "Awaiting approval"
        : "Sign in";

  return (
    <div
      className="fixed top-4 left-4 z-40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-2 transition-all duration-300 ease-out"
        style={{
          background: "var(--surface-card)",
          border: `1px solid ${color}`,
          borderRadius: "8px",
          padding: hovered ? "8px 14px" : "8px",
          boxShadow: glow,
          cursor: authState === "unauthenticated" ? "pointer" : "default",
          maxWidth: hovered ? "280px" : "40px",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        onClick={authState === "unauthenticated" ? onSignIn : undefined}
      >
        {/* Lock SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            filter: `drop-shadow(${glow.split(",")[0]})`,
            transition: "all 0.3s ease",
          }}
        >
          {/* Lock body */}
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          {/* Shackle */}
          {isOpen ? (
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          ) : (
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          )}
          {/* Question mark for pending */}
          {authState === "pending" && (
            <text
              x="12"
              y="19"
              textAnchor="middle"
              fill={color}
              stroke="none"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ?
            </text>
          )}
        </svg>

        {/* Expandable status text */}
        <div
          style={{
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s ease 0.1s",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            className="font-mono text-xs tracking-wide"
            style={{ color }}
          >
            {statusLabel}
          </span>

          {/* Sign out button (only when logged in and hovered) */}
          {authState !== "unauthenticated" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSignOut();
              }}
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-colors duration-200"
              style={{
                color: "var(--neon-pink)",
                border: "1px solid var(--border-pink)",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 45, 117, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
