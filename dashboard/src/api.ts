const BASE = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  adReviewStatus: string;
  offerId: string | null;
  dailyBudget: number;
  lifetimeBudget: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  dailyBudget: number;
  createdAt: string;
  updatedAt: string;
  latestMetrics?: MetricsSnapshot | null;
}

export interface Ad {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  latestMetrics?: MetricsSnapshot | null;
}

export interface MetricsSnapshot {
  id: string;
  entityId: string;
  entityLevel: string;
  timestamp: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpl: number;
  registrationRate: number;
  qualifiedLeads: number | null;
  cpql: number | null;
  revenue: number | null;
  roas: number | null;
}

export interface Offer {
  id: string;
  name: string;
  niche: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tier: 'universal' | 'offer';
  offerId: string | null;
  entityLevel: string;
  conditions: { metric: string; operator: string; threshold: number }[];
  action: string;
  actionParams: Record<string, number>;
  priority: number;
  cooldownMinutes: number;
}

export interface Recommendation {
  id: string;
  entity_id: string;
  entity_level: string;
  action: string;
  action_params: string;
  confidence: number;
  reasoning: string;
  triggered_rule_ids: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  discord_message_id: string | null;
}

export interface OverviewStats {
  campaigns: { total: number; active: number; paused: number };
  metrics: { totalSpend: number; totalLeads: number; totalClicks: number; totalImpressions: number; avgCpl: number };
  pendingActions: number;
  topCampaigns: { id: string; name: string; status: string; budget: number; spend: number; leads: number; cpl: number; ctr: number }[];
  recentActions: Recommendation[];
}

export const api = {
  getOverview: () => fetchJson<OverviewStats>('/overview'),
  getCampaigns: () => fetchJson<Campaign[]>('/campaigns'),
  getCampaignMetrics: (id: string, limit = 24) =>
    fetchJson<MetricsSnapshot[]>(`/campaigns/${id}/metrics?limit=${limit}`),
  getCampaignAdSets: (campaignId: string) =>
    fetchJson<AdSet[]>(`/campaigns/${campaignId}/adsets`),
  getAdSetAds: (adSetId: string) =>
    fetchJson<Ad[]>(`/adsets/${adSetId}/ads`),
  getLatestMetrics: (id: string) =>
    fetchJson<MetricsSnapshot>(`/campaigns/${id}/metrics/latest`),
  submitManualMetrics: (data: { entityId: string; spend: number; impressions: number; clicks: number; leads: number }) =>
    postJson<{ snapshot: MetricsSnapshot; evaluated: number; triggered: number; recommendations: string[] }>('/metrics/manual', data),
  pollMetrics: () => postJson<{ polled: number; evaluated: number; triggered: number; recommendations: string[] }>('/metrics/poll'),
  injectAnomaly: (campaignId: string, type: string, duration = 3) =>
    postJson('/test/anomaly', { campaignId, type, duration }),
  getOffers: () => fetchJson<Offer[]>('/offers'),
  createOffer: (offer: Partial<Offer>) => postJson<Offer>('/offers', offer),
  updateOffer: (id: string, updates: Partial<Offer>) =>
    fetch(`${BASE}/offers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }).then(r => r.json()),
  deleteOffer: (id: string) =>
    fetch(`${BASE}/offers/${id}`, { method: 'DELETE' }).then(r => r.json()),
  assignCampaignOffer: (campaignId: string, offerId: string | null) =>
    postJson(`/campaigns/${campaignId}/offer`, { offerId }),
  getRules: () => fetchJson<Rule[]>('/rules'),
  createRule: (rule: Partial<Rule>) => postJson<Rule>('/rules', rule),
  updateRule: (id: string, updates: Partial<Rule>) =>
    fetch(`${BASE}/rules/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }).then(r => r.json()),
  deleteRule: (id: string) =>
    fetch(`${BASE}/rules/${id}`, { method: 'DELETE' }).then(r => r.json()),
  // Feedback & Suggestions
  getFeedbackStats: () => fetchJson<any[]>('/feedback/stats'),
  analyzeFeedback: () => postJson('/feedback/analyze'),
  getSuggestions: () => fetchJson<any[]>('/suggestions'),
  getPendingSuggestions: () => fetchJson<any[]>('/suggestions/pending'),
  generateSuggestions: () => postJson<{ generated: number; suggestions: any[] }>('/suggestions/generate'),
  approveSuggestion: (id: string) => postJson(`/suggestions/${id}/approve`),
  denySuggestion: (id: string) => postJson(`/suggestions/${id}/deny`),

  declineCampaign: (id: string) => postJson(`/test/decline/${id}`),
  approveCampaignAd: (id: string) => postJson(`/test/approve-ad/${id}`),
  getRecommendations: (limit = 50) => fetchJson<Recommendation[]>(`/recommendations?limit=${limit}`),
  getPendingRecommendations: () => fetchJson<Recommendation[]>('/recommendations/pending'),
  approveRecommendation: (id: string) => postJson(`/recommendations/${id}/approve`),
  denyRecommendation: (id: string) => postJson(`/recommendations/${id}/deny`),
};
