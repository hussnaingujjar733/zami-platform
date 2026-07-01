export interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lon: number;
}

export interface RenovationRecommendation {
  title: string;
  priority: string;
  impact: string;
  cost: number;
}

export interface EstimateResponse {
  address: string;
  postcode: string;
  dpe: string;
  targetDpe: string;
  surface: number;
  estimatedCost: number;
  subsidies: number;
  netCost: number;
  yearlySavings: number;
  paybackYears: number;
  estimatedValueGain: number;
  confidence: string;
  source: string;
  note: string;
  recommendations: RenovationRecommendation[];
}
