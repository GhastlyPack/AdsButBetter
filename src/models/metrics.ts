import { EntityLevel } from './campaign';

export interface MetricsSnapshot {
  id: string;
  entityId: string;
  entityLevel: EntityLevel;
  timestamp: string;

  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;

  // Derived (calculated on ingestion)
  ctr: number;        // clicks / impressions
  cpc: number;        // spend / clicks
  cpa: number;        // spend / conversions
  roas: number;       // revenue / spend
}
