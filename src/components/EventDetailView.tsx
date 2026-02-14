"use client";

import { useEffect, useMemo, useState } from "react";
import type { FxRatesErrorResponse, FxRatesResponse, LexerEvent, ViewerMode } from "@/lib/types";
import { REDACTED_ADDRESS_LABEL } from "@/lib/privacy-constants";
import { formatCost } from "@/lib/data";
import FlipDate from "./FlipDate";
import LexerPresenceIcon from "./LexerPresenceIcon";
import RecurringBadge from "./RecurringBadge";

interface EventDetailViewProps {
  event: LexerEvent;
  viewerMode: ViewerMode;
  onClose: () => void;
}

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  IE: "EUR",
  NL: "EUR",
  BE: "EUR",
  PT: "EUR",
};

function toGoogleCalendarDate(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function buildGoogleCalendarUrl(event: LexerEvent): string {
  const startDate = new Date(event.date);
  const fallbackStart = Number.isFinite(startDate.valueOf()) ? startDate : new Date();
  const endDate = new Date(fallbackStart.getTime() + 2 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${toGoogleCalendarDate(fallbackStart)}/${toGoogleCalendarDate(endDate)}`,
    details: event.description,
    location: event.address,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function detectLocalCurrency(fallbackCurrency: string): string {
  if (typeof window === "undefined") {
    return fallbackCurrency;
  }

  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const region = locale.split("-")[1]?.toUpperCase();

  if (!region) {
    return fallbackCurrency;
  }

  return COUNTRY_TO_CURRENCY[region] ?? fallbackCurrency;
}

function isFxRatesResponse(value: unknown): value is FxRatesResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FxRatesResponse>;
  if (
    candidate.source !== "live" ||
    !candidate.ratesToUsd ||
    typeof candidate.ratesToUsd !== "object"
  ) {
    return false;
  }

  return Object.values(candidate.ratesToUsd).every(
    (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0
  );
}

function isFxRatesErrorResponse(value: unknown): value is FxRatesErrorResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FxRatesErrorResponse>;
  return typeof candidate.error === "string" && candidate.error.trim().length > 0;
}

function convertCost(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesToUsd: Record<string, number>
): number | null {
  const fromRate = ratesToUsd[fromCurrency];
  const toRate = ratesToUsd[toCurrency];

  if (!fromRate || !toRate) {
    return null;
  }

  return (amount * fromRate) / toRate;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function EventDetailView({
  event,
  viewerMode,
  onClose,
}: EventDetailViewProps) {
  const [isDoorPressed, setIsDoorPressed] = useState(false);
  const [isDoorHovered, setIsDoorHovered] = useState(false);
  const [showLocalCost, setShowLocalCost] = useState(false);
  const [navigationHint, setNavigationHint] = useState<string | null>(null);
  const [fxRatesToUsd, setFxRatesToUsd] = useState<Record<string, number> | null>(null);
  const [fxLoadState, setFxLoadState] = useState<"loading" | "live" | "error">("loading");
  const [fxError, setFxError] = useState<string | null>(null);

  const isOutsider = viewerMode === "outsider";
  const isLexerComingUnknown = event.isLexerComing === "?";
  const lexerComingLabel = isLexerComingUnknown ? "?" : event.isLexerComing ? "YES" : "NO";
  const lexerComingColor = isLexerComingUnknown
    ? "var(--neon-yellow)"
    : event.isLexerComing
    ? "var(--neon-cyan)"
    : "var(--neon-pink)";

  const localCurrency = useMemo(() => detectLocalCurrency(event.currency), [event.currency]);
  const convertedCost = useMemo(
    () => {
      if (!fxRatesToUsd) {
        return null;
      }

      return convertCost(event.cost, event.currency, localCurrency, fxRatesToUsd);
    },
    [event.cost, event.currency, fxRatesToUsd, localCurrency]
  );

  const canConvertCost =
    fxLoadState === "live" &&
    event.cost > 0 &&
    localCurrency !== event.currency &&
    convertedCost !== null &&
    Number.isFinite(convertedCost);

  const displayedCost = useMemo(() => {
    if (event.cost === 0) {
      return "FREE!";
    }

    if (showLocalCost && canConvertCost && convertedCost !== null) {
      return `${formatCurrency(convertedCost, localCurrency)}${event.hasAdditionalTiers ? "+" : ""}`;
    }

    return formatCost(event.cost, event.currency, event.hasAdditionalTiers);
  }, [
    canConvertCost,
    convertedCost,
    event.cost,
    event.currency,
    event.hasAdditionalTiers,
    localCurrency,
    showLocalCost,
  ]);

  useEffect(() => {
    let active = true;

    const loadFxRates = async () => {
      try {
        const response = await fetch("/api/fx", { cache: "no-store" });
        if (!response.ok) {
          const errorPayload = (await response.json()) as unknown;
          if (active && isFxRatesErrorResponse(errorPayload)) {
            setFxError(errorPayload.error);
          } else if (active) {
            setFxError("Live FX rates are unavailable.");
          }
          if (active) {
            setFxRatesToUsd(null);
            setFxLoadState("error");
          }
          return;
        }

        const payload = (await response.json()) as unknown;
        if (!active) {
          return;
        }

        if (!isFxRatesResponse(payload)) {
          setFxError("Live FX rates are unavailable.");
          setFxRatesToUsd(null);
          setFxLoadState("error");
          return;
        }

        setFxRatesToUsd(payload.ratesToUsd);
        setFxLoadState("live");
        setFxError(null);
      } catch {
        if (active) {
          setFxError("Live FX rates are unavailable.");
          setFxRatesToUsd(null);
          setFxLoadState("error");
        }
      }
    };

    loadFxRates();

    return () => {
      active = false;
    };
  }, []);

  const shouldShowFxError = event.cost > 0 && localCurrency !== event.currency && fxLoadState === "error";

  const costHintText =
    event.cost === 0
      ? "No ticket fee"
      : shouldShowFxError
      ? "Live FX unavailable"
      : fxLoadState === "loading" && localCurrency !== event.currency
      ? "Loading live FX"
      : canConvertCost
      ? showLocalCost
        ? "Tap for source"
        : `Tap for ${localCurrency} (live FX)`
      : "Base tier price";

  const mapUrl = useMemo(() => {
    const params = new URLSearchParams({
      api: "1",
      destination: event.address,
      travelmode: "driving",
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [event.address]);

  const calendarUrl = useMemo(() => buildGoogleCalendarUrl(event), [event]);

  useEffect(() => {
    if (!navigationHint) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNavigationHint(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [navigationHint]);

  const handleNavigationClick = () => {
    if (isOutsider) {
      setNavigationHint("Navigation unlocks for approved insiders.");
      return;
    }

    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center p-2 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-[fadeIn_0.2s_ease-out]"
        style={{
          background:
            "radial-gradient(circle at 18% 20%, rgba(0, 240, 255, 0.11), transparent 45%), radial-gradient(circle at 82% 84%, rgba(255, 45, 117, 0.14), transparent 44%), var(--surface-overlay)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      <div
        className="panel-shell benday-overlay benday-cyan scanline relative flex w-full max-w-2xl flex-col overflow-hidden
          max-h-[92vh] rounded-2xl animate-[fadeScale_0.25s_ease-out] sm:max-h-[90vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(16, 12, 34, 0.95) 0%, rgba(8, 9, 23, 0.94) 100%)",
          border: "1px solid var(--border-cyan)",
          boxShadow:
            "0 0 40px rgba(176, 38, 255, 0.15), 0 0 80px rgba(255, 45, 117, 0.08)",
        }}
      >
        <div
          className="relative z-[2] grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2.5 sm:px-4"
          style={{ borderBottom: "1px solid rgba(255, 45, 117, 0.2)" }}
        >
          <button
            onClick={onClose}
            aria-label="Close event detail"
            className="relative z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded border transition-colors"
            style={{
              color: "var(--neon-pink)",
              borderColor: "var(--border-pink)",
              background: "rgba(255, 45, 117, 0.08)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>

          <span className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--copy-muted)" }}>
            EVENT VIEW
          </span>

          <div className="flex h-11 w-11 items-center justify-end">
            {event.recurrent ? <RecurringBadge size={34} /> : null}
          </div>
        </div>

        <div className="relative z-[2] flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex items-center gap-2">
            {viewerMode === "insider" && event.isLexerComing === true && <LexerPresenceIcon size={20} />}
            <h1
              className="font-mono text-xl font-black uppercase tracking-wide text-neon-pink sm:text-2xl"
              style={{ textShadow: "0 0 12px rgba(255, 45, 117, 0.6), 0 0 30px rgba(255, 45, 117, 0.3)" }}
            >
              {event.name}
            </h1>
          </div>

          <div className="mb-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-neon-purple">&#9737;</span>
              <span style={{ color: "var(--copy-secondary)" }}>
                <FlipDate iso={event.date} />
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-neon-purple">&#9672;</span>
              <span style={{ color: "var(--copy-secondary)" }}>{event.manualLocation}</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-neon-purple">&#8962;</span>
              <span style={{ color: "var(--copy-secondary)" }}>
                {isOutsider ? <span className="glitch-redact">{REDACTED_ADDRESS_LABEL}</span> : event.address}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-neon-cyan">&#9733;</span>
              <span style={{ color: "var(--copy-secondary)" }}>
                Lexer coming:{" "}
                {isLexerComingUnknown ? (
                  <span className="glitch-redact">{lexerComingLabel}</span>
                ) : (
                  <span style={{ color: lexerComingColor }}>{lexerComingLabel}</span>
                )}
              </span>
            </div>

            {event.locationPrecision === "fuzzed" && (
              <p className="font-mono text-xs uppercase tracking-wide" style={{ color: "rgba(255, 225, 86, 0.85)" }}>
                outsider coordinates are deterministic privacy fuzzes
              </p>
            )}
          </div>

          <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--copy-primary)" }}>
            {event.description}
          </p>

          {navigationHint && (
            <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: "var(--neon-yellow)" }}>
              {navigationHint}
            </p>
          )}

          {shouldShowFxError && fxError && (
            <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: "var(--neon-yellow)" }}>
              {fxError}
            </p>
          )}
        </div>

        <div
          className="relative z-[2] mobile-safe-bottom flex flex-wrap items-center justify-end gap-2 border-t px-4 pb-4 pt-3 sm:px-6 sm:pb-5"
          style={{ borderTopColor: "rgba(0, 240, 255, 0.18)" }}
        >
          <button
            type="button"
            onClick={handleNavigationClick}
            aria-disabled={isOutsider}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{
              color: isOutsider ? "rgba(179, 184, 214, 0.56)" : "var(--neon-cyan)",
              borderColor: isOutsider ? "rgba(148, 158, 197, 0.24)" : "var(--border-cyan)",
              background: isOutsider ? "rgba(92, 104, 141, 0.12)" : "rgba(0, 240, 255, 0.08)",
            }}
          >
            <span aria-hidden="true">&#10148;</span>
            Navigate
          </button>

          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{
              color: "var(--neon-purple)",
              borderColor: "rgba(176, 38, 255, 0.38)",
              background: "rgba(176, 38, 255, 0.09)",
            }}
          >
            <span aria-hidden="true">&#128197;</span>
            Calendar
          </a>

          <DoorButton
            inviteUrl={event.inviteUrl}
            isPressed={isDoorPressed}
            isHovered={isDoorHovered}
            onHoverChange={setIsDoorHovered}
            onPressChange={setIsDoorPressed}
          />

          <button
            type="button"
            onClick={() => {
              if (canConvertCost) {
                setShowLocalCost((prev) => !prev);
              }
            }}
            className="grid min-w-[94px] cursor-pointer rounded-md border px-2 py-1 text-left"
            style={{
              borderColor: "rgba(255, 45, 117, 0.32)",
              background: "rgba(255, 45, 117, 0.09)",
            }}
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" style={{ color: "var(--neon-pink)" }}>
              {displayedCost}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--copy-muted)" }}>
              {costHintText}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function DoorButton({
  inviteUrl,
  isPressed,
  isHovered,
  onHoverChange,
  onPressChange,
}: {
  inviteUrl: string;
  isPressed: boolean;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onPressChange: (pressed: boolean) => void;
}) {
  const doorAngle = isPressed ? -78 : isHovered ? -16 : 0;

  return (
    <a
      href={inviteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open invite link"
      className="group/door burst-lines relative block cursor-pointer"
      style={{ perspective: "800px" }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => {
        onHoverChange(false);
        onPressChange(false);
      }}
      onPointerDown={() => onPressChange(true)}
      onPointerUp={() => onPressChange(false)}
      onPointerCancel={() => onPressChange(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onPressChange(true);
        }
      }}
      onKeyUp={() => onPressChange(false)}
    >
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
        style={{
          border: "1px solid rgba(0, 240, 255, 0.3)",
          background: "linear-gradient(130deg, rgba(0, 240, 255, 0.08), rgba(176, 38, 255, 0.08))",
        }}
      >
        <div className="relative h-10 w-8" style={{ perspective: "800px" }}>
          <div
            className="absolute inset-0 rounded-sm transition-opacity duration-300"
            style={{
              opacity: isPressed || isHovered ? 1 : 0,
              background:
                "radial-gradient(ellipse at center, rgba(0, 240, 255, 0.3), rgba(255, 225, 86, 0.15), transparent)",
              boxShadow:
                isPressed || isHovered
                  ? "0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(255, 225, 86, 0.1)"
                  : "none",
            }}
          />

          <div
            className="absolute inset-0 rounded-sm"
            style={{
              border: "2px solid rgba(0, 240, 255, 0.5)",
              background: "rgba(0, 240, 255, 0.05)",
            }}
          />

          <div
            className="absolute inset-0 rounded-sm"
            style={{
              transformOrigin: "left center",
              background: "rgba(0, 240, 255, 0.2)",
              border: "2px solid var(--neon-cyan)",
              boxShadow: isPressed ? "-5px 0 15px rgba(0, 240, 255, 0.4)" : "0 0 8px rgba(0, 240, 255, 0.3)",
              transform: `rotateY(${doorAngle}deg)`,
              transition: isPressed
                ? "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease"
                : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
            }}
          >
            <div
              className="absolute right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
              style={{
                background: "var(--neon-cyan)",
                boxShadow: "0 0 4px var(--neon-cyan)",
              }}
            />
          </div>
        </div>

        <span
          className="font-mono text-sm font-bold uppercase tracking-wider text-neon-cyan"
          style={{ textShadow: "var(--glow-cyan-sm)" }}
        >
          ENTER
        </span>

      </div>
    </a>
  );
}
