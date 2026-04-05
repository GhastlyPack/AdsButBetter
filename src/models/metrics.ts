import { EntityLevel } from './campaign';

export interface MetricsSnapshot {
  id: string;
  entityId: string;
  entityLevel: EntityLevel;
  timestamp: string;

  spend: number;
  impressions: number;
  clicks: number;
  leads: number;              // registrations (webinar signups, form fills, etc.)

  // Derived (calculated on ingestion)
  ctr: number;                // clicks / impressions
  cpc: number;                // spend / clicks
  cpl: number;                // spend / leads
  registrationRate: number;   // leads / clicks (landing page conversion)

  // Populated later via GHL integration
  qualifiedLeads: number | null;
  cpql: number | null;        // spend / qualifiedLeads
  revenue: number | null;
  roas: number | null;        // revenue / spend
}
