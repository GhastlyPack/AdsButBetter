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
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

export const api = {
  getCampaigns: () => fetchJson<Campaign[]>('/campaigns'),
  getCampaignMetrics: (id: string, limit = 24) =>
    fetchJson<MetricsSnapshot[]>(`/campaigns/${id}/metrics?limit=${limit}`),
  getLatestMetrics: (id: string) =>
    fetchJson<MetricsSnapshot>(`/campaigns/${id}/metrics/latest`),
  pollMetrics: () => postJson<{ polled: number; snapshots: MetricsSnapshot[] }>('/metrics/poll'),
  injectAnomaly: (campaignId: string, type: string, duration = 3) =>
    postJson('/test/anomaly', { campaignId, type, duration }),
};
