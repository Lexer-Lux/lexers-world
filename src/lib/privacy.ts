import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { LexerEvent, ViewerMode } from "@/lib/types";

const FALLBACK_FUZZ_SECRET = "dev-fuzz-secret-change-me";

let warnedAboutFallbackSecret = false;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeLng(value: number): number {
  let lng = value;
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}

function getFuzzSecret(): string {
  const envSecret = process.env.FUZZ_SECRET?.trim();
  if (envSecret) {
    return envSecret;
  }

  if (!warnedAboutFallbackSecret) {
    warnedAboutFallbackSecret = true;
    console.warn("[privacy] FUZZ_SECRET is missing. Using development fallback secret.");
  }

  return FALLBACK_FUZZ_SECRET;
}

function fuzzCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const seed = `${lat.toFixed(6)}|${lng.toFixed(6)}`;
  const digest = createHmac("sha256", getFuzzSecret()).update(seed).digest();

  const distanceSeed = digest.readUInt32BE(0) / 0xffffffff;
  const bearingSeed = digest.readUInt32BE(4) / 0xffffffff;

  const distanceKm = 2 + distanceSeed * 6;
  const angularDistance = distanceKm / 6371;
  const bearing = bearingSeed * Math.PI * 2;

  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);

  const fuzzedLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const fuzzedLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(fuzzedLatRad)
    );

  return {
    lat: Number(toDegrees(fuzzedLatRad).toFixed(5)),
    lng: Number(normalizeLng(toDegrees(fuzzedLngRad)).toFixed(5)),
  };
}

function shouldAllowInsiderByPreviewToken(request: Request): boolean {
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");
  const tokenFromHeader = request.headers.get("x-insider-preview-token");
  const suppliedToken = tokenFromHeader ?? tokenFromQuery;
  const expectedToken = process.env.INSIDER_PREVIEW_TOKEN?.trim();

  if (!expectedToken) {
    return process.env.NODE_ENV !== "production";
  }

  return suppliedToken === expectedToken;
}

function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey);
}

export async function resolveViewerMode(request: Request): Promise<ViewerMode> {
  // 1. Check for Bearer token (real auth)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = getServerSupabaseClient();

    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        const twitterUsername =
          (user.user_metadata?.user_name as string | undefined) ??
          (user.user_metadata?.preferred_username as string | undefined);

        if (twitterUsername) {
          const { data: allowlistRow } = await supabase
            .from("allowlist")
            .select("id")
            .eq("twitter_username", twitterUsername.toLowerCase())
            .maybeSingle();

          return allowlistRow ? "insider" : "outsider";
        }
      }
    }
  }

  // 2. Fallback: legacy preview token check (for dev)
  const url = new URL(request.url);
  const queryViewer = url.searchParams.get("viewer")?.toLowerCase();
  const headerViewer = request.headers.get("x-lexer-viewer")?.toLowerCase();
  const requestedViewer = headerViewer ?? queryViewer;

  if (requestedViewer === "insider" && shouldAllowInsiderByPreviewToken(request)) {
    return "insider";
  }

  return "outsider";
}

export function applyViewerPrivacy(event: LexerEvent, viewerMode: ViewerMode): LexerEvent {
  if (viewerMode === "insider") {
    return {
      ...event,
      locationPrecision: "precise",
    };
  }

  const fuzzed = fuzzCoordinates(event.lat, event.lng);

  return {
    ...event,
    lat: fuzzed.lat,
    lng: fuzzed.lng,
    address: "[ LOCATION BLACKBOXED ]",
    isLexerComing: "?",
    locationPrecision: "fuzzed",
  };
}

export function getPrivacyDisclaimer(viewerMode: ViewerMode): string {
  if (viewerMode === "insider") {
    return "Insider mode: precise coordinates and Lexer attendance are visible.";
  }

  return "Outsider mode: map coordinates are deterministic privacy fuzzes and venue details are blackboxed.";
}
