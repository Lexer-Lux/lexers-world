import { createHmac } from "node:crypto";
import { resolveViewerAuthStatus } from "@/lib/auth";
import type { GeolocationPrivacySettings, LexerEvent, ViewerAuthStatus, ViewerMode } from "@/lib/types";
import {
  INSIDER_PRIVACY_DISCLAIMER,
  OUTSIDER_PRIVACY_DISCLAIMER,
  REDACTED_ADDRESS_LABEL,
} from "@/lib/privacy-constants";

const FALLBACK_FUZZ_SECRET = "dev-fuzz-secret-change-me";
const DEFAULT_FUZZ_MIN_DISTANCE_KM = 2;
const DEFAULT_FUZZ_MAX_DISTANCE_KM = 8;
const DEFAULT_FUZZ_COORDINATE_DECIMALS = 5;
const MIN_FUZZ_DISTANCE_KM = 0.25;
const MAX_FUZZ_DISTANCE_KM = 50;
const MIN_FUZZ_COORDINATE_DECIMALS = 2;
const MAX_FUZZ_COORDINATE_DECIMALS = 6;

let warnedAboutFallbackSecret = false;
let cachedGeolocationSettings: GeolocationPrivacySettings | null = null;

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

function readNumericEnv(
  envKey: string,
  fallback: number,
  min: number,
  max: number
): number {
  const rawValue = process.env[envKey];
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function getGeolocationPrivacySettings(): GeolocationPrivacySettings {
  if (cachedGeolocationSettings) {
    return cachedGeolocationSettings;
  }

  const minDistanceKm = readNumericEnv(
    "FUZZ_MIN_DISTANCE_KM",
    DEFAULT_FUZZ_MIN_DISTANCE_KM,
    MIN_FUZZ_DISTANCE_KM,
    MAX_FUZZ_DISTANCE_KM
  );

  const configuredMaxDistanceKm = readNumericEnv(
    "FUZZ_MAX_DISTANCE_KM",
    DEFAULT_FUZZ_MAX_DISTANCE_KM,
    MIN_FUZZ_DISTANCE_KM,
    MAX_FUZZ_DISTANCE_KM
  );

  const coordinateDecimals = Math.round(
    readNumericEnv(
      "FUZZ_COORDINATE_DECIMALS",
      DEFAULT_FUZZ_COORDINATE_DECIMALS,
      MIN_FUZZ_COORDINATE_DECIMALS,
      MAX_FUZZ_COORDINATE_DECIMALS
    )
  );

  cachedGeolocationSettings = {
    minDistanceKm,
    maxDistanceKm: Math.max(configuredMaxDistanceKm, minDistanceKm + 0.25),
    coordinateDecimals,
  };

  return cachedGeolocationSettings;
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
  const { minDistanceKm, maxDistanceKm, coordinateDecimals } = getGeolocationPrivacySettings();
  const seed = `${lat.toFixed(6)}|${lng.toFixed(6)}`;
  const digest = createHmac("sha256", getFuzzSecret()).update(seed).digest();

  const distanceSeed = digest.readUInt32BE(0) / 0xffffffff;
  const bearingSeed = digest.readUInt32BE(4) / 0xffffffff;

  const distanceKm = minDistanceKm + distanceSeed * (maxDistanceKm - minDistanceKm);
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
    lat: Number(toDegrees(fuzzedLatRad).toFixed(coordinateDecimals)),
    lng: Number(normalizeLng(toDegrees(fuzzedLngRad)).toFixed(coordinateDecimals)),
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

export async function resolveViewerMode(
  request: Request,
  authStatus?: ViewerAuthStatus
): Promise<ViewerMode> {
  const resolvedAuth = authStatus ?? (await resolveViewerAuthStatus(request));

  if (resolvedAuth.isAuthenticated && resolvedAuth.isApproved) {
    return "insider";
  }

  // Fallback: legacy preview token check (for dev)
  const url = new URL(request.url);
  const queryViewer = url.searchParams.get("viewer")?.toLowerCase();
  const headerViewer = request.headers.get("x-lexer-viewer")?.toLowerCase();
  const requestedViewer = headerViewer ?? queryViewer;

  if (requestedViewer === "insider" && shouldAllowInsiderByPreviewToken(request)) {
    return "insider";
  }

  return "outsider";
}

function projectInsiderEvent(event: LexerEvent): LexerEvent {
  return {
    id: event.id,
    name: event.name,
    manualLocation: event.manualLocation,
    address: event.address,
    lat: event.lat,
    lng: event.lng,
    description: event.description,
    isLexerComing: event.isLexerComing,
    recurrent: event.recurrent,
    inviteUrl: event.inviteUrl,
    date: event.date,
    cost: event.cost,
    currency: event.currency,
    hasAdditionalTiers: event.hasAdditionalTiers,
    locationPrecision: "precise",
  };
}

function projectOutsiderEvent(event: LexerEvent): LexerEvent {
  const fuzzed = fuzzCoordinates(event.lat, event.lng);

  return {
    id: event.id,
    name: event.name,
    manualLocation: event.manualLocation,
    address: REDACTED_ADDRESS_LABEL,
    lat: fuzzed.lat,
    lng: fuzzed.lng,
    description: event.description,
    isLexerComing: "?",
    recurrent: event.recurrent,
    inviteUrl: event.inviteUrl,
    date: event.date,
    cost: event.cost,
    currency: event.currency,
    hasAdditionalTiers: event.hasAdditionalTiers,
    locationPrecision: "fuzzed",
  };
}

export function applyViewerPrivacy(event: LexerEvent, viewerMode: ViewerMode): LexerEvent {
  if (viewerMode === "insider") {
    return projectInsiderEvent(event);
  }

  return projectOutsiderEvent(event);
}

export function getPrivacyDisclaimer(viewerMode: ViewerMode): string {
  if (viewerMode === "insider") {
    return INSIDER_PRIVACY_DISCLAIMER;
  }

  return OUTSIDER_PRIVACY_DISCLAIMER;
}
