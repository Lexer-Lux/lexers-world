import { KeyLocation, LexerEvent } from "./types";

export const KEY_LOCATIONS: KeyLocation[] = [
  { id: "bay-area", name: "Bay Area, CA", lat: 37.7749, lng: -122.4194 },
  { id: "london", name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { id: "new-york", name: "New York, NY", lat: 40.7128, lng: -74.006 },
  { id: "toronto", name: "Toronto, ON", lat: 43.6532, lng: -79.3832 },
  { id: "montreal", name: "Montréal, QC", lat: 45.5017, lng: -73.5673 },
];

// Mock events — will be replaced by Supabase queries
export const MOCK_EVENTS: LexerEvent[] = [
  {
    id: "evt-1",
    name: "Neon Nights Meetup",
    manualLocation: "Bay Area, CA",
    lat: 37.7849,
    lng: -122.4094,
    description:
      "Monthly gathering for creative technologists. Live coding, music, and neon aesthetics.",
    isLexerComing: true,
    recurrent: true,
    inviteUrl: "https://example.com/neon-nights",
    date: "2026-03-15T20:00:00Z",
  },
  {
    id: "evt-2",
    name: "Synthwave Gallery Opening",
    manualLocation: "Bay Area, CA",
    lat: 37.7694,
    lng: -122.4262,
    description:
      "Art exhibition featuring retro-futuristic digital art and synthwave music.",
    isLexerComing: false,
    recurrent: false,
    inviteUrl: "https://example.com/synthwave-gallery",
    date: "2026-03-22T18:00:00Z",
  },
  {
    id: "evt-3",
    name: "London Hackers Social",
    manualLocation: "London, UK",
    lat: 51.5174,
    lng: -0.1078,
    description:
      "Casual drinks and demos with London's indie hacker community.",
    isLexerComing: true,
    recurrent: true,
    inviteUrl: "https://example.com/london-hackers",
    date: "2026-03-10T19:00:00Z",
  },
  {
    id: "evt-4",
    name: "Cyber Punk Rock Show",
    manualLocation: "London, UK",
    lat: 51.5244,
    lng: -0.0782,
    description:
      "Live music at the intersection of punk and cyberpunk. Bring earplugs.",
    isLexerComing: false,
    recurrent: false,
    inviteUrl: "https://example.com/punk-rock",
    date: "2026-04-05T21:00:00Z",
  },
  {
    id: "evt-5",
    name: "NYC Creative Coders",
    manualLocation: "New York, NY",
    lat: 40.7228,
    lng: -73.996,
    description:
      "Workshop on creative coding with Three.js, shaders, and generative art.",
    isLexerComing: true,
    recurrent: true,
    inviteUrl: "https://example.com/nyc-coders",
    date: "2026-03-20T18:30:00Z",
  },
  {
    id: "evt-6",
    name: "Retro Arcade Night",
    manualLocation: "New York, NY",
    lat: 40.7508,
    lng: -73.9875,
    description: "Classic arcade games, pixel art, and chiptune music.",
    isLexerComing: true,
    recurrent: false,
    inviteUrl: "https://example.com/arcade-night",
    date: "2026-04-12T20:00:00Z",
  },
  {
    id: "evt-7",
    name: "Toronto Indie Devs",
    manualLocation: "Toronto, ON",
    lat: 43.6472,
    lng: -79.3932,
    description:
      "Showcase night for indie game devs and creative software projects.",
    isLexerComing: false,
    recurrent: true,
    inviteUrl: "https://example.com/toronto-indie",
    date: "2026-03-18T19:00:00Z",
  },
  {
    id: "evt-8",
    name: "Montréal Digital Arts Jam",
    manualLocation: "Montréal, QC",
    lat: 45.5087,
    lng: -73.5543,
    description:
      "48-hour jam creating interactive digital art installations. All skill levels.",
    isLexerComing: true,
    recurrent: false,
    inviteUrl: "https://example.com/mtl-jam",
    date: "2026-04-01T10:00:00Z",
  },
  {
    id: "evt-9",
    name: "Montréal Glitch Art Workshop",
    manualLocation: "Montréal, QC",
    lat: 45.4957,
    lng: -73.5773,
    description:
      "Learn glitch art techniques: databending, pixel sorting, and circuit bending.",
    isLexerComing: false,
    recurrent: true,
    inviteUrl: "https://example.com/mtl-glitch",
    date: "2026-03-25T14:00:00Z",
  },
];

export function getEventsForLocation(locationName: string): LexerEvent[] {
  return MOCK_EVENTS.filter((e) => e.manualLocation === locationName);
}
