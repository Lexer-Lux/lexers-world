import { NextResponse } from "next/server";
import { MOCK_EVENTS } from "@/lib/data";
import { isSupabaseConfigured, loadEvents } from "@/lib/events";
import { applyViewerPrivacy, getPrivacyDisclaimer, resolveViewerMode } from "@/lib/privacy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewerMode = await resolveViewerMode(request);

  try {
    const events = await loadEvents();
    const visibleEvents = events.map((event) => applyViewerPrivacy(event, viewerMode));

    return NextResponse.json({
      events: visibleEvents,
      source: isSupabaseConfigured() ? "supabase" : "mock",
      viewerMode,
      privacyDisclaimer: getPrivacyDisclaimer(viewerMode),
    });
  } catch {
    return NextResponse.json({
      events: MOCK_EVENTS.map((event) => applyViewerPrivacy(event, viewerMode)),
      source: "mock",
      viewerMode,
      privacyDisclaimer: getPrivacyDisclaimer(viewerMode),
    });
  }
}
