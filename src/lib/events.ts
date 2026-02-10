import { MOCK_EVENTS } from "@/lib/data";
import { LexerEvent } from "@/lib/types";

const EVENT_SELECT_COLUMNS = [
  "id",
  "name",
  "manual_location",
  "address",
  "lat",
  "lng",
  "description",
  "is_lexer_coming",
  "recurrent",
  "invite_url",
  "date",
  "cost",
  "currency",
  "has_additional_tiers",
].join(",");

interface SupabaseEventRow {
  id?: unknown;
  name?: unknown;
  manual_location?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  description?: unknown;
  is_lexer_coming?: unknown;
  recurrent?: unknown;
  invite_url?: unknown;
  date?: unknown;
  cost?: unknown;
  currency?: unknown;
  has_additional_tiers?: unknown;
}

const ISO_CURRENCY_CODE = /^[A-Z]{3}$/;

function toStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function toIsoDate(value: unknown): string | null {
  const rawDate = toStringValue(value);
  if (!rawDate) {
    return null;
  }

  const timestamp = Date.parse(rawDate);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function toCurrency(value: unknown): string | null {
  const rawCurrency = toStringValue(value);
  if (!rawCurrency) {
    return null;
  }

  const upper = rawCurrency.toUpperCase();
  return ISO_CURRENCY_CODE.test(upper) ? upper : null;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseSupabaseEvent(row: SupabaseEventRow): { event: LexerEvent } | { error: string } {
  const id = toStringValue(row.id);
  if (!id) {
    return { error: "missing id" };
  }

  const name = toStringValue(row.name);
  if (!name) {
    return { error: `missing name for ${id}` };
  }

  const manualLocation = toStringValue(row.manual_location);
  if (!manualLocation) {
    return { error: `missing manual_location for ${id}` };
  }

  const address = toStringValue(row.address);
  if (!address) {
    return { error: `missing address for ${id}` };
  }

  const description = toStringValue(row.description);
  if (!description) {
    return { error: `missing description for ${id}` };
  }

  const inviteUrl = toStringValue(row.invite_url);
  if (!inviteUrl || !isValidUrl(inviteUrl)) {
    return { error: `invalid invite_url for ${id}` };
  }

  const date = toIsoDate(row.date);
  if (!date) {
    return { error: `invalid date for ${id}` };
  }

  const lat = toNumber(row.lat);
  if (lat === null || lat < -90 || lat > 90) {
    return { error: `invalid lat for ${id}` };
  }

  const lng = toNumber(row.lng);
  if (lng === null || lng < -180 || lng > 180) {
    return { error: `invalid lng for ${id}` };
  }

  const isLexerComing = toBoolean(row.is_lexer_coming);
  if (isLexerComing === null) {
    return { error: `invalid is_lexer_coming for ${id}` };
  }

  const recurrent = toBoolean(row.recurrent);
  if (recurrent === null) {
    return { error: `invalid recurrent for ${id}` };
  }

  const hasAdditionalTiers = toBoolean(row.has_additional_tiers);
  if (hasAdditionalTiers === null) {
    return { error: `invalid has_additional_tiers for ${id}` };
  }

  const cost = toNumber(row.cost);
  if (cost === null || cost < 0) {
    return { error: `invalid cost for ${id}` };
  }

  const currency = toCurrency(row.currency);
  if (!currency) {
    return { error: `invalid currency for ${id}` };
  }

  return {
    event: {
      id,
      name,
      manualLocation,
      address,
      lat,
      lng,
      description,
      isLexerComing,
      recurrent,
      inviteUrl,
      date,
      cost,
      currency,
      hasAdditionalTiers,
    },
  };
}

function getRequiredEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getRequiredEnv() !== null;
}

export async function loadEvents(): Promise<LexerEvent[]> {
  const env = getRequiredEnv();
  if (!env) {
    return MOCK_EVENTS;
  }

  const query = new URLSearchParams({
    select: EVENT_SELECT_COLUMNS,
    order: "date.asc",
  });

  const response = await fetch(`${env.url}/rest/v1/events?${query.toString()}`, {
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${env.anonKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase events fetch failed with ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("Supabase events payload is not an array");
  }

  const events: LexerEvent[] = [];
  const malformedRows: string[] = [];

  for (const row of payload) {
    const parsed = parseSupabaseEvent((row ?? {}) as SupabaseEventRow);
    if ("error" in parsed) {
      malformedRows.push(parsed.error);
      continue;
    }

    events.push(parsed.event);
  }

  if (malformedRows.length > 0) {
    console.warn(
      `[events] skipped ${malformedRows.length} malformed Supabase row(s)`,
      malformedRows.slice(0, 5)
    );
  }

  if (events.length === 0 && payload.length > 0) {
    throw new Error("Supabase returned only malformed event rows");
  }

  return events;
}
