import type { FxRatesResponse } from "@/lib/types";

const SUPPORTED_CURRENCIES = ["USD", "CAD", "GBP", "EUR", "JPY", "AUD", "NZD", "CHF", "SEK", "NOK", "DKK"];

const DEFAULT_PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
const DEFAULT_CACHE_TTL_SECONDS = 6 * 60 * 60;
const MIN_CACHE_TTL_SECONDS = 5 * 60;
const MAX_CACHE_TTL_SECONDS = 24 * 60 * 60;
const FX_REQUEST_TIMEOUT_MS = 4500;

interface FxProviderPayload {
  result?: string;
  rates?: Record<string, unknown>;
  time_last_update_utc?: string;
}

interface CachedFxPayload {
  payload: FxRatesResponse;
  expiresAtMs: number;
}

let cachedFxPayload: CachedFxPayload | null = null;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseCacheTtlSeconds(): number {
  const rawValue = process.env.FX_CACHE_TTL_SECONDS;
  const parsed = toFiniteNumber(rawValue);

  if (parsed === null) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }

  return Math.round(Math.min(MAX_CACHE_TTL_SECONDS, Math.max(MIN_CACHE_TTL_SECONDS, parsed)));
}

function getProviderUrl(): string {
  const configuredUrl = process.env.FX_PROVIDER_URL?.trim();
  if (!configuredUrl) {
    return DEFAULT_PROVIDER_URL;
  }

  return configuredUrl;
}

function normalizeProviderRatesToUsd(
  providerRates: Record<string, unknown>
): Record<string, number> {
  const normalizedRates: Record<string, number> = { USD: 1 };

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === "USD") {
      continue;
    }

    const usdToCurrency = toFiniteNumber(providerRates[currency]);
    if (usdToCurrency === null || usdToCurrency <= 0) {
      throw new Error(`Missing or invalid live FX rate for ${currency}`);
    }

    const toUsd = 1 / usdToCurrency;
    normalizedRates[currency] = Number(toUsd.toFixed(6));
  }

  return normalizedRates;
}
async function fetchLiveFxRates(): Promise<FxRatesResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FX_REQUEST_TIMEOUT_MS);

  const response = await fetch(getProviderUrl(), {
    signal: controller.signal,
    cache: "no-store",
  });

  try {
    if (!response.ok) {
      throw new Error(`FX provider returned ${response.status}`);
    }

    const payload = (await response.json()) as FxProviderPayload;
    if (payload.result !== "success" || !payload.rates) {
      throw new Error("FX provider returned invalid payload");
    }

    return {
      ratesToUsd: normalizeProviderRatesToUsd(payload.rates),
      source: "live",
      updatedAt: payload.time_last_update_utc ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getFxRates(): Promise<FxRatesResponse> {
  const nowMs = Date.now();
  if (cachedFxPayload && nowMs < cachedFxPayload.expiresAtMs) {
    return cachedFxPayload.payload;
  }

  const livePayload = await fetchLiveFxRates();
  cachedFxPayload = {
    payload: livePayload,
    expiresAtMs: nowMs + parseCacheTtlSeconds() * 1000,
  };
  return livePayload;
}
