import { NextResponse } from "next/server";
import { MOCK_EVENTS } from "@/lib/data";
import { isSupabaseConfigured, loadEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await loadEvents();

    return NextResponse.json({
      events,
      source: isSupabaseConfigured() ? "supabase" : "mock",
    });
  } catch {
    return NextResponse.json({ events: MOCK_EVENTS, source: "mock" });
  }
}
