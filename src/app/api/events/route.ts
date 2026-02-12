import { NextResponse } from "next/server";
import { MOCK_EVENTS } from "@/lib/data";
import { getApprovalMessage, resolveViewerAuthStatus } from "@/lib/auth";
import { isSupabaseConfigured, loadEvents } from "@/lib/events";
import {
  applyViewerPrivacy,
  getGeolocationPrivacySettings,
  getPrivacyDisclaimer,
  resolveViewerMode,
} from "@/lib/privacy";
import type { EventsApiResponse, EventsSource, ViewerAuthStatus, ViewerMode } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildResponse(
  events: EventsApiResponse["events"],
  viewerMode: ViewerMode,
  source: EventsSource,
  authStatus: ViewerAuthStatus
) {
  const geolocationSettings = getGeolocationPrivacySettings();
  const isPreviewInsider = viewerMode === "insider" && !authStatus.isApproved;
  const effectiveAuthStatus: ViewerAuthStatus = isPreviewInsider
    ? {
        isAuthenticated: true,
        isApproved: true,
        twitterUsername: authStatus.twitterUsername,
      }
    : authStatus;

  const payload: EventsApiResponse = {
    events,
    source,
    viewerMode,
    privacyDisclaimer: getPrivacyDisclaimer(viewerMode),
    geolocationSettings,
    authStatus: effectiveAuthStatus,
    approvalMessage: isPreviewInsider
      ? "Insider preview mode active. Manual allowlist checks are bypassed for this request."
      : getApprovalMessage(authStatus),
  };

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-lexer-viewer-mode": viewerMode,
      "x-lexer-location-precision": viewerMode === "insider" ? "precise" : "fuzzed",
      "x-lexer-fuzz-min-km": geolocationSettings.minDistanceKm.toString(),
      "x-lexer-fuzz-max-km": geolocationSettings.maxDistanceKm.toString(),
      "x-lexer-fuzz-coordinate-decimals": geolocationSettings.coordinateDecimals.toString(),
    },
  });
}

export async function GET(request: Request) {
  const authStatus = await resolveViewerAuthStatus(request);
  const viewerMode = await resolveViewerMode(request, authStatus);

  try {
    const events = await loadEvents();
    const visibleEvents = events.map((event) => applyViewerPrivacy(event, viewerMode));

    return buildResponse(visibleEvents, viewerMode, isSupabaseConfigured() ? "supabase" : "mock", authStatus);
  } catch {
    return buildResponse(
      MOCK_EVENTS.map((event) => applyViewerPrivacy(event, viewerMode)),
      viewerMode,
      "mock",
      authStatus
    );
  }
}
