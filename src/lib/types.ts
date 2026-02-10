export interface KeyLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type ViewerMode = "outsider" | "insider";

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
