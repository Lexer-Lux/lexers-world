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
  id: string;
  name: string;
  manual_location: string;
  address: string;
  lat: number | string;
  lng: number | string;
  description: string;
  is_lexer_coming: boolean;
  recurrent: boolean;
  invite_url: string;
  date: string;
  cost: number | string;
  currency: string;
  has_additional_tiers: boolean;
}

function toNumber(value: number | string, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapSupabaseEvent(row: SupabaseEventRow): LexerEvent {
  return {
    id: row.id,
    name: row.name,
    manualLocation: row.manual_location,
    address: row.address,
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
    description: row.description,
    isLexerComing: row.is_lexer_coming,
    recurrent: row.recurrent,
    inviteUrl: row.invite_url,
    date: row.date,
    cost: toNumber(row.cost),
    currency: row.currency,
    hasAdditionalTiers: row.has_additional_tiers,
  };
}

function getRequiredEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

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

  const rows = (await response.json()) as SupabaseEventRow[];
  return rows.map(mapSupabaseEvent);
}
