import type { FoodCategory, Merchant, SurpriseBag } from './customer.types';

export interface FinderConstraints {
  maxBudget: number | null;
  people: number;
  category: Exclude<FoodCategory, 'all'> | null;
  area: string | null;
  pickupBefore: string | null;
  preferences: string[];
}

export interface FinderInput {
  query: string;
  bags: SurpriseBag[];
  merchants: Merchant[];
  coords?: { lat: number; lng: number } | null;
  now?: Date;
}

export interface FinderResult {
  bag: SurpriseBag;
  merchant?: Merchant;
  quantity: number;
  totalPrice: number;
  distanceKm: number | null;
  reasons: string[];
}

export interface FinderResponse {
  mode: 'local' | 'ai';
  constraints: FinderConstraints;
  results: FinderResult[];
  warnings: string[];
}
