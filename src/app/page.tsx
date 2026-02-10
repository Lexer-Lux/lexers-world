"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import {
  DEFAULT_AESTHETIC_RUNTIME_SETTINGS,
  type AestheticRuntimeSettings,
} from "@/lib/aesthetic-settings";
import { getEventsForLocation, MOCK_EVENTS } from "@/lib/data";
import { LEXER_TWITTER_URL } from "@/lib/app-config";
import { DEFAULT_GLOBE_RUNTIME_SETTINGS } from "@/lib/globe-settings";
import {
  INSIDER_PRIVACY_DISCLAIMER,
  OUTSIDER_PRIVACY_DISCLAIMER,
  REDACTED_ADDRESS_LABEL,
} from "@/lib/privacy-constants";
import type { EventsApiResponse, LexerEvent, ViewerMode } from "@/lib/types";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase";
import DevDrawer from "@/components/DevDrawer";
import EventListPanel from "@/components/EventListPanel";
import EventDetailView from "@/components/EventDetailView";
import GlobeTitlePlane from "@/components/GlobeTitlePlane";
import LockIcon, { AuthState } from "@/components/LockIcon";

import type { Session } from "@supabase/supabase-js";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

function hasAuthStatus(value: unknown): value is EventsApiResponse["authStatus"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EventsApiResponse["authStatus"]>;
  return (
    typeof candidate.isAuthenticated === "boolean" &&
    typeof candidate.isApproved === "boolean" &&
    (typeof candidate.twitterUsername === "string" || candidate.twitterUsername === null)
  );
}

function stripModePrefix(message: string): string {
  return message.replace(/^\s*(outsider|insider|pending)\s+mode:\s*/i, "").trim();
}

export default function Home() {
  const authConfigured = isSupabaseBrowserConfigured();

  const [events, setEvents] = useState<LexerEvent[]>(MOCK_EVENTS);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LexerEvent | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("outsider");
  const [privacyDisclaimer, setPrivacyDisclaimer] = useState<string>(OUTSIDER_PRIVACY_DISCLAIMER);

  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>("unauthenticated");
  const [globeAltitude, setGlobeAltitude] = useState(2.5);
  const [runtimeSettings, setRuntimeSettings] = useState(DEFAULT_GLOBE_RUNTIME_SETTINGS);
  const [aestheticSettings, setAestheticSettings] =
    useState<AestheticRuntimeSettings>(DEFAULT_AESTHETIC_RUNTIME_SETTINGS);
  const [authMessage, setAuthMessage] = useState<string>(
    "Outsider access only. Sign in with X to request insider approval."
  );
  const [approvedUsername, setApprovedUsername] = useState<string | undefined>(undefined);

  // Fetch events, optionally with auth token
  const fetchEvents = useCallback(async (accessToken?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/events", {
        cache: "no-store",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Events API returned ${response.status}`);
      }

      const payload = (await response.json()) as Partial<EventsApiResponse>;
      if (!Array.isArray(payload.events)) {
        throw new Error("Events API returned invalid data");
      }

      setEvents(payload.events);
      if (payload.viewerMode === "insider" || payload.viewerMode === "outsider") {
        setViewerMode(payload.viewerMode);
        // Derive auth state from viewer mode when logged in
        if (accessToken) {
          setAuthState(payload.viewerMode === "insider" ? "insider" : "pending");
        }
      }
      if (typeof payload.privacyDisclaimer === "string" && payload.privacyDisclaimer.trim().length > 0) {
        setPrivacyDisclaimer(payload.privacyDisclaimer);
      }

      if (hasAuthStatus(payload.authStatus)) {
        setAuthState(
          payload.authStatus.isAuthenticated
            ? payload.authStatus.isApproved
              ? "insider"
              : "pending"
            : "unauthenticated"
        );
        setApprovedUsername(payload.authStatus.twitterUsername ?? undefined);
      } else if (accessToken) {
        setAuthState(payload.viewerMode === "insider" ? "insider" : "pending");
      }

      if (
        authConfigured &&
        typeof payload.approvalMessage === "string" &&
        payload.approvalMessage.trim().length > 0
      ) {
        setAuthMessage(payload.approvalMessage);
      }
    } catch {
      setEvents(
        MOCK_EVENTS.map((event) => ({
          ...event,
          isLexerComing: "?",
          address: REDACTED_ADDRESS_LABEL,
          locationPrecision: "fuzzed" as const,
        }))
      );
      setViewerMode("outsider");
      setPrivacyDisclaimer(OUTSIDER_PRIVACY_DISCLAIMER);
      setAuthState(authConfigured ? (accessToken ? "pending" : "unauthenticated") : "unauthenticated");
      setAuthMessage(
        !authConfigured
          ? "Sign in is unavailable on this deployment (missing Supabase public env vars)."
          : accessToken
          ? "Signed in, but approval status could not be verified."
          : "Outsider access only. Sign in with X to request insider approval."
      );
    }
  }, [authConfigured]);

  // Initialize auth listener
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setSession(null);
      setAuthState("unauthenticated");
      setApprovedUsername(undefined);
      setAuthMessage("Sign in is unavailable on this deployment (missing Supabase public env vars).");
      fetchEvents();
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        setAuthState("pending"); // will be refined by fetchEvents
      }
      fetchEvents(initialSession?.access_token);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setAuthState("pending");
        fetchEvents(newSession.access_token);
      } else {
        setAuthState("unauthenticated");
        fetchEvents();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchEvents]);

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthState("unauthenticated");
      setAuthMessage("Sign in is unavailable on this deployment (missing Supabase public env vars).");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSession(null);
      setAuthState("unauthenticated");
      setApprovedUsername(undefined);
      setAuthMessage("Sign in is unavailable on this deployment (missing Supabase public env vars).");
      fetchEvents();
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setAuthState("unauthenticated");
    setApprovedUsername(undefined);
    setAuthMessage("Outsider access only. Sign in with X to request insider approval.");
    fetchEvents();
  };

  const twitterUsername =
    approvedUsername ??
    ((session?.user?.user_metadata?.user_name as string | undefined) ??
      (session?.user?.user_metadata?.preferred_username as string | undefined));

  const selectedLocationEvents = useMemo(() => {
    if (!selectedLocation) return [];
    return getEventsForLocation(selectedLocation, events);
  }, [events, selectedLocation]);

  const isWarGamesMode = runtimeSettings.enableWarGamesEffect;
  const isPaperMode = runtimeSettings.enablePaperEffect;

  const lockDetailMessage =
    authState === "insider"
      ? stripModePrefix(INSIDER_PRIVACY_DISCLAIMER)
      : authState === "unauthenticated"
        ? stripModePrefix(privacyDisclaimer)
        : stripModePrefix(authMessage);

  const runtimeCssVars = useMemo(
    () =>
      ({
        "--motion-lines-opacity": aestheticSettings.showMotionLines
          ? aestheticSettings.motionLinesOpacity.toFixed(3)
          : "0",
        "--motion-lines-duration": `${aestheticSettings.motionLinesSpeedSeconds}s`,
        "--edge-streaks-opacity": aestheticSettings.showEdgeStreaks
          ? aestheticSettings.edgeStreaksOpacity.toFixed(3)
          : "0",
        "--edge-streaks-duration": `${aestheticSettings.edgeStreaksSpeedSeconds}s`,
        "--burst-overlay-opacity": aestheticSettings.showBurstOverlay
          ? aestheticSettings.burstOverlayOpacity.toFixed(3)
          : "0",
        "--burst-overlay-duration": `${aestheticSettings.burstOverlayPulseSeconds}s`,
        "--benday-opacity": aestheticSettings.bendayOpacity.toFixed(3),
        "--comic-caption-opacity": aestheticSettings.showComicCaptions ? "1" : "0",
        "--comic-caption-rotation": `${aestheticSettings.comicCaptionRotationDeg}deg`,
        "--panel-blur": `${aestheticSettings.panelBlurPx}px`,
        "--glitch-animation-name": aestheticSettings.glitchEnabled ? "censorGlitch" : "none",
        "--glitch-duration": `${aestheticSettings.glitchSpeedSeconds}s`,
      }) as CSSProperties,
    [aestheticSettings]
  );

  const nebulaBackground = useMemo(() => {
    if (isWarGamesMode) {
      return "radial-gradient(circle at 24% 22%, rgba(83, 255, 178, 0.28) 0%, rgba(83, 255, 178, 0) 34%), radial-gradient(circle at 76% 74%, rgba(27, 208, 133, 0.22) 0%, rgba(27, 208, 133, 0) 42%), radial-gradient(circle at 50% 12%, rgba(152, 255, 207, 0.18) 0%, rgba(152, 255, 207, 0) 45%)";
    }

    if (isPaperMode) {
      return "radial-gradient(circle at 24% 22%, rgba(215, 170, 123, 0.24) 0%, rgba(215, 170, 123, 0) 34%), radial-gradient(circle at 76% 74%, rgba(173, 111, 79, 0.2) 0%, rgba(173, 111, 79, 0) 42%), radial-gradient(circle at 50% 12%, rgba(145, 119, 81, 0.16) 0%, rgba(145, 119, 81, 0) 45%)";
    }

    return "radial-gradient(circle at 24% 22%, rgba(0, 240, 255, 0.36) 0%, rgba(0, 240, 255, 0) 34%), radial-gradient(circle at 76% 74%, rgba(255, 45, 117, 0.3) 0%, rgba(255, 45, 117, 0) 42%), radial-gradient(circle at 50% 12%, rgba(176, 38, 255, 0.25) 0%, rgba(176, 38, 255, 0) 45%)";
  }, [isPaperMode, isWarGamesMode]);

  const gridLineColor = isWarGamesMode
    ? "95, 255, 187"
    : isPaperMode
      ? "143, 113, 76"
      : "88, 158, 255";

  const gridOverlayBackground = useMemo(
    () =>
      `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)), repeating-linear-gradient(${aestheticSettings.gridAngleDeg}deg, rgba(${gridLineColor}, 0.08) 0px, rgba(${gridLineColor}, 0.08) 1px, transparent 1px, transparent ${aestheticSettings.gridSpacingPx}px)`,
    [aestheticSettings.gridAngleDeg, aestheticSettings.gridSpacingPx, gridLineColor]
  );

  const horizonBackground = useMemo(() => {
    if (isWarGamesMode) {
      return "linear-gradient(180deg, rgba(3, 10, 8, 0) 0%, rgba(4, 15, 11, 0.72) 46%, rgba(2, 9, 7, 0.96) 100%)";
    }

    if (isPaperMode) {
      return "linear-gradient(180deg, rgba(24, 18, 12, 0) 0%, rgba(28, 20, 12, 0.7) 46%, rgba(20, 14, 9, 0.94) 100%)";
    }

    return "linear-gradient(180deg, rgba(6, 9, 23, 0) 0%, rgba(5, 8, 19, 0.72) 46%, rgba(3, 4, 12, 0.96) 100%)";
  }, [isPaperMode, isWarGamesMode]);

  const handleLocationClick = (locationName: string) => {
    setSelectedLocation(locationName);
    setSelectedEvent(null);
  };

  const handleEventClick = (event: LexerEvent) => {
    setSelectedEvent(event);
    if (!selectedLocation) {
      setSelectedLocation(event.manualLocation);
    }
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setSelectedEvent(null);
  };

  return (
    <main className="motion-lines relative h-screen w-screen overflow-hidden bg-background" style={runtimeCssVars}>
      {aestheticSettings.showNebula && (
        <div
          className="absolute inset-[-18%] pointer-events-none"
          style={{
            background: nebulaBackground,
            opacity: aestheticSettings.nebulaOpacity,
            filter: `blur(${aestheticSettings.nebulaBlurPx}px)`,
            animation: `driftNebula ${aestheticSettings.nebulaDriftSeconds}s ease-in-out infinite`,
          }}
        />
      )}
      {aestheticSettings.showGridOverlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: aestheticSettings.gridOpacity,
            backgroundImage: gridOverlayBackground,
            mixBlendMode: "screen",
            animation: `gridParallax ${aestheticSettings.gridDriftSeconds}s linear infinite`,
          }}
        />
      )}
      {aestheticSettings.showHorizonFade && (
        <div
          className="absolute inset-x-0 bottom-0 h-52 pointer-events-none"
          style={{
            opacity: aestheticSettings.horizonOpacity,
            background: horizonBackground,
          }}
        />
      )}

      {aestheticSettings.showEdgeStreaks && (
        <div className="edge-streaks-overlay absolute inset-0 pointer-events-none" />
      )}

      {aestheticSettings.showBurstOverlay && (
        <div className="comic-burst-overlay absolute inset-0 pointer-events-none" />
      )}

      <Globe
        events={events}
        onLocationClick={handleLocationClick}
        onEventClick={handleEventClick}
        runtimeSettings={runtimeSettings}
        onAltitudeChange={setGlobeAltitude}
      />

      {/* Lock icon — auth UI */}
        <LockIcon
          authState={authState}
          username={twitterUsername}
          detailMessage={lockDetailMessage}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

      <GlobeTitlePlane altitude={globeAltitude} enabled={runtimeSettings.showCurvedTitle} />

      {/* Event list panel */}
      {selectedLocation && !selectedEvent && (
        <EventListPanel
          locationName={selectedLocation}
          events={selectedLocationEvents}
          onEventClick={handleEventClick}
          onClose={handleClose}
          twitterUrl={LEXER_TWITTER_URL}
        />
      )}

      {/* Event detail view */}
      {selectedEvent && (
        <EventDetailView
          event={selectedEvent}
          viewerMode={viewerMode}
          onClose={handleClose}
        />
      )}

      <a
        href={LEXER_TWITTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-safe-bottom fixed bottom-2 right-3 z-40 font-mono text-[18px] font-bold uppercase tracking-[0.18em]"
        style={{
          color: "var(--neon-cyan)",
          textShadow: "0 0 12px rgba(0, 240, 255, 0.42)",
        }}
      >
        LEXER
      </a>

      <DevDrawer
        globeSettings={runtimeSettings}
        onGlobeChange={setRuntimeSettings}
        aestheticSettings={aestheticSettings}
        onAestheticChange={setAestheticSettings}
      />
    </main>
  );
}
