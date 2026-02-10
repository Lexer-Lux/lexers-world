"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getEventsForLocation, MOCK_EVENTS } from "@/lib/data";
import { LexerEvent, ViewerMode } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import EventListPanel from "@/components/EventListPanel";
import EventDetailView from "@/components/EventDetailView";
import LockIcon, { AuthState } from "@/components/LockIcon";

import type { Session } from "@supabase/supabase-js";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function Home() {
  const [events, setEvents] = useState<LexerEvent[]>(MOCK_EVENTS);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LexerEvent | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("outsider");
  const [privacyDisclaimer, setPrivacyDisclaimer] = useState<string>(
    "Outsider mode: map coordinates are deterministic privacy fuzzes and venue details are blackboxed."
  );

  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>("unauthenticated");

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

      const payload = (await response.json()) as {
        events?: LexerEvent[];
        viewerMode?: ViewerMode;
        privacyDisclaimer?: string;
      };
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
    } catch {
      setEvents(
        MOCK_EVENTS.map((event) => ({
          ...event,
          isLexerComing: "?",
          address: "[ LOCATION BLACKBOXED ]",
          locationPrecision: "fuzzed" as const,
        }))
      );
      setViewerMode("outsider");
    }
  }, []);

  // Initialize auth listener
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

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
    await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setAuthState("unauthenticated");
    fetchEvents();
  };

  const twitterUsername = session?.user?.user_metadata?.user_name as string | undefined;

  const selectedLocationEvents = useMemo(() => {
    if (!selectedLocation) return [];
    return getEventsForLocation(selectedLocation, events);
  }, [events, selectedLocation]);

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

  const handleBack = () => {
    setSelectedEvent(null);
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setSelectedEvent(null);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 18% 14%, rgba(0, 216, 255, 0.2) 0%, rgba(0, 216, 255, 0) 34%), radial-gradient(circle at 82% 86%, rgba(255, 45, 117, 0.2) 0%, rgba(255, 45, 117, 0) 36%), linear-gradient(180deg, #040712 0%, #080b1f 52%, #090412 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(105, 175, 255, 0.06) 0px, rgba(105, 175, 255, 0.06) 1px, transparent 1px, transparent 9px)",
          mixBlendMode: "screen",
        }}
      />

      <Globe events={events} onLocationClick={handleLocationClick} onEventClick={handleEventClick} />

      {/* Lock icon — auth UI */}
      <LockIcon
        authState={authState}
        username={twitterUsername}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Title overlay */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none">
        <h1
          className="text-xl sm:text-3xl font-bold tracking-widest uppercase font-mono text-neon-pink"
          style={{
            textShadow: "var(--glow-pink)",
          }}
        >
          {"LEXER'S WORLD"}
        </h1>
        {/* Comic-style speed lines behind title */}
        <div
          className="absolute inset-0 -inset-x-8 opacity-[0.04]"
          style={{
            background: "repeating-linear-gradient(90deg, transparent, transparent 6px, var(--neon-pink) 6px, var(--neon-pink) 7px)",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
      </div>

      {/* Event list panel */}
      {selectedLocation && !selectedEvent && (
        <EventListPanel
          locationName={selectedLocation}
          events={selectedLocationEvents}
          onEventClick={handleEventClick}
          onClose={handleClose}
        />
      )}

      {/* Event detail view */}
      {selectedEvent && (
        <EventDetailView
          event={selectedEvent}
          viewerMode={viewerMode}
          onBack={handleBack}
          onClose={handleClose}
        />
      )}

      {viewerMode === "outsider" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-4">
          <p
            className="text-[11px] sm:text-xs font-mono uppercase tracking-wide text-center"
            style={{
              color: "rgba(255, 225, 86, 0.9)",
              textShadow: "0 0 8px rgba(255, 225, 86, 0.25)",
            }}
          >
            {privacyDisclaimer}
          </p>
        </div>
      )}
    </main>
  );
}
