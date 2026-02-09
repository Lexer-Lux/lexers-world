export interface KeyLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface LexerEvent {
  id: string;
  name: string;
  manualLocation: string; // key location name or nearest major city
  lat: number;
  lng: number;
  description: string;
  isLexerComing: boolean;
  recurrent: boolean;
  inviteUrl: string;
  date: string; // ISO date string
  cost: number; // base price, defaults to 0 (free)
  currency: string; // ISO 4217 currency code, defaults to "USD"
  hasAdditionalTiers: boolean; // true = show "+" suffix on price
}
