export interface PublicManagerSummary {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  zonesOfIntervention: string[];
  ratingAverage: number;
  ratingCount: number;
  memberSince: Date;
}

export interface PaginatedPublicManagers {
  data: PublicManagerSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicManagerReview {
  id: string;
  rating: number;
  comment: string | null;
  ownerName: string;
  createdAt: Date;
}

export interface PublicManagerPortfolio {
  totalManagedProperties: number;
  byType: Array<{ type: string; count: number }>;
}

export interface PublicManagerDetail extends PublicManagerSummary {
  pricingNote: string | null;
  portfolio: PublicManagerPortfolio;
  reviews: PublicManagerReview[];
}
