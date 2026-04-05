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
  daily_budget: number;
  lifetime_budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface MetricsSnapshot {
  id: string;
  entity_id: string;
  entity_level: string;
  timestamp: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpl: number;
  registration_rate: number;
  qualified_leads: number | null;
  cpql: number | null;
  revenue: number | null;
  roas: number | null;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: number;
  entity_level: string;
  conditions: string; // JSON string from SQLite
  action: string;
  action_params: string;
  priority: number;
  cooldown_minutes: number;
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
}

export const api = {
  getCampaigns: () => fetchJson<Campaign[]>('/campaigns'),
  getCampaignMetrics: (id: string, limit = 24) =>
    fetchJson<MetricsSnapshot[]>(`/campaigns/${id}/metrics?limit=${limit}`),
  getLatestMetrics: (id: string) =>
    fetchJson<MetricsSnapshot>(`/campaigns/${id}/metrics/latest`),
  pollMetrics: () => postJson<{ polled: number; evaluated: number; triggered: number; recommendations: string[] }>('/metrics/poll'),
  injectAnomaly: (campaignId: string, type: string, duration = 3) =>
    postJson('/test/anomaly', { campaignId, type, duration }),
  getRules: () => fetchJson<Rule[]>('/rules'),
  getRecommendations: (limit = 50) => fetchJson<Recommendation[]>(`/recommendations?limit=${limit}`),
  getPendingRecommendations: () => fetchJson<Recommendation[]>('/recommendations/pending'),
  approveRecommendation: (id: string) => postJson(`/recommendations/${id}/approve`),
  denyRecommendation: (id: string) => postJson(`/recommendations/${id}/deny`),
};
