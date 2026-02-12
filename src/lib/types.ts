export interface KeyLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type ViewerMode = "outsider" | "insider";

export interface ViewerAuthStatus {
  isAuthenticated: boolean;
  isApproved: boolean;
  twitterUsername: string | null;
}

export interface GeolocationPrivacySettings {
  minDistanceKm: number;
  maxDistanceKm: number;
  coordinateDecimals: number;
}

export type FxRateSource = "live";

export interface FxRatesResponse {
  ratesToUsd: Record<string, number>;
  source: FxRateSource;
  updatedAt: string | null;
}

export interface FxRatesErrorResponse {
  error: string;
}

export interface LexerEvent {
  id: string;
  name: string;
  manualLocation: string; // key location name or nearest major city
  address: string; // actual physical address as entered by creator
  lat: number; // geocoded from address, cached
  lng: number; // geocoded from address, cached
  description: string;
  isLexerComing: boolean | "?";
  recurrent: boolean;
  inviteUrl: string;
  date: string; // ISO date string
  cost: number; // base price, defaults to 0 (free)
  currency: string; // ISO 4217 currency code, defaults to "USD"
  hasAdditionalTiers: boolean; // true = show "+" suffix on price
  locationPrecision?: "precise" | "fuzzed";
}

export type EventsSource = "supabase" | "mock";

export interface EventsApiResponse {
  events: LexerEvent[];
  source: EventsSource;
  viewerMode: ViewerMode;
  privacyDisclaimer: string;
  geolocationSettings: GeolocationPrivacySettings;
  authStatus: ViewerAuthStatus;
  approvalMessage: string;
}
