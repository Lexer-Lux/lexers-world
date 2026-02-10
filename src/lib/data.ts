import { KeyLocation, LexerEvent } from "./types";

export const KEY_LOCATIONS: KeyLocation[] = [
  { id: "bay-area", name: "Bay Area, CA", lat: 37.7749, lng: -122.4194 },
  { id: "london", name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { id: "new-york", name: "New York, NY", lat: 40.7128, lng: -74.006 },
  { id: "toronto", name: "Toronto, ON", lat: 43.6532, lng: -79.3832 },
  { id: "austin", name: "Austin, TX", lat: 30.2672, lng: -97.7431 },
];

// Currency symbol lookup
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", JPY: "¥",
};

export function formatCost(cost: number, currency: string, hasAdditionalTiers: boolean): string {
  if (cost === 0) return hasAdditionalTiers ? "FREE+" : "FREE";
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  const price = Number.isInteger(cost) ? cost.toString() : cost.toFixed(2);
  return `${symbol}${price}${hasAdditionalTiers ? "+" : ""}`;
}

// Mock events — will be replaced by Supabase queries
export const MOCK_EVENTS: LexerEvent[] = [
  {
    id: "evt-1",
    name: "Neon Nights Meetup",
    manualLocation: "Bay Area, CA",
    address: "The Midway, 900 Marin St, San Francisco, CA 94124",
    lat: 37.7849,
    lng: -122.4094,
    description:
      "Monthly gathering for creative technologists. Live coding, music, and neon aesthetics.",
    isLexerComing: true,
    recurrent: true,
    inviteUrl: "https://example.com/neon-nights",
    date: "2026-03-15T20:00:00Z",
    cost: 0,
    currency: "USD",
    hasAdditionalTiers: false,
  },
  {
    id: "evt-2",
    name: "Synthwave Gallery Opening",
    manualLocation: "Bay Area, CA",
    address: "Gray Area, 2665 Mission St, San Francisco, CA 94110",
    lat: 37.7694,
    lng: -122.4262,
    description:
      "Art exhibition featuring retro-futuristic digital art and synthwave music.",
    isLexerComing: false,
    recurrent: false,
    inviteUrl: "https://example.com/synthwave-gallery",
    date: "2026-03-22T18:00:00Z",
    cost: 15,
    currency: "USD",
    hasAdditionalTiers: true,
  },
  {
    id: "evt-3",
    name: "London Hackers Social",
    manualLocation: "London, UK",
    address: "The Barbican Centre, Silk St, London EC2Y 8DS, UK",
    lat: 51.5174,
    lng: -0.1078,
    description:
      "Casual drinks and demos with London's indie hacker community.",
    isLexerComing: true,
    recurrent: true,
    inviteUrl: "https://example.com/london-hackers",
    date: "2026-03-10T19:00:00Z",
    cost: 0,
    currency: "GBP",
    hasAdditionalTiers: false,
  },
  {
    id: "evt-4",
    name: "Cyber Punk Rock Show",
    manualLocation: "London, UK",
    address: "93 Feet East, 150 Brick Ln, London E1 6QL, UK",
    lat: 51.5244,
    lng: -0.0782,
    description:
      "Live music at the intersection of punk and cyberpunk. Bring earplugs.",
    isLexerComing: false,
    recurrent: false,
    inviteUrl: "https://example.com/punk-rock",
    date: "2026-04-05T21:00:00Z",
    cost: 20,
    currency: "GBP",
    hasAdditionalTiers: false,
  },
  {
    id: "evt-5",
    name: "NYC Creative Coders",
    manualLocation: "New York, NY",
    address: "ITP/NYU, 370 Jay St, Brooklyn, NY 11201",
    lat: 40.7228,
    lng: -73.996,
    description:
      "Workshop on creative coding with Three.js, shaders, and generative art.",
    isLexerComing: true,
    recurrent: true,
    inviteUrl: "https://example.com/nyc-coders",
    date: "2026-03-20T18:30:00Z",
    cost: 10,
    currency: "USD",
    hasAdditionalTiers: true,
  },
  {
    id: "evt-6",
    name: "Retro Arcade Night",
    manualLocation: "New York, NY",
    address: "Barcade, 148 W 24th St, New York, NY 10011",
    lat: 40.7508,
    lng: -73.9875,
    description: "Classic arcade games, pixel art, and chiptune music.",
    isLexerComing: true,
    recurrent: false,
    inviteUrl: "https://example.com/arcade-night",
    date: "2026-04-12T20:00:00Z",
    cost: 5,
    currency: "USD",
    hasAdditionalTiers: false,
  },
  {
    id: "evt-7",
    name: "Toronto Indie Devs",
    manualLocation: "Toronto, ON",
    address: "Gamma Space, 298 Brunswick Ave, Toronto, ON M5S 2M7",
    lat: 43.6472,
    lng: -79.3932,
    description:
      "Showcase night for indie game devs and creative software projects.",
    isLexerComing: false,
    recurrent: true,
    inviteUrl: "https://example.com/toronto-indie",
    date: "2026-03-18T19:00:00Z",
    cost: 0,
    currency: "CAD",
    hasAdditionalTiers: true,
  },
  {
    id: "evt-8",
    name: "Montréal Digital Arts Jam",
    manualLocation: "Montréal, QC",
    address: "Eastern Bloc, 7240 Rue Clark, Montréal, QC H2R 1W4",
    lat: 45.5087,
    lng: -73.5543,
    description:
      "48-hour jam creating interactive digital art installations. All skill levels.",
    isLexerComing: true,
    recurrent: false,
    inviteUrl: "https://example.com/mtl-jam",
    date: "2026-04-01T10:00:00Z",
    cost: 25,
    currency: "CAD",
    hasAdditionalTiers: true,
  },
  {
    id: "evt-9",
    name: "Montréal Glitch Art Workshop",
    manualLocation: "Montréal, QC",
    address: "Perte de Signal, 243 Rue du Parc Industriel, Montréal, QC H8R 1J1",
    lat: 45.4957,
    lng: -73.5773,
    description:
      "Learn glitch art techniques: databending, pixel sorting, and circuit bending.",
    isLexerComing: false,
    recurrent: true,
    inviteUrl: "https://example.com/mtl-glitch",
    date: "2026-03-25T14:00:00Z",
    cost: 0,
    currency: "CAD",
    hasAdditionalTiers: false,
  },
];

export function getEventsForLocation(
  locationName: string,
  events: LexerEvent[] = MOCK_EVENTS
): LexerEvent[] {
  return events.filter((e) => e.manualLocation === locationName);
}
