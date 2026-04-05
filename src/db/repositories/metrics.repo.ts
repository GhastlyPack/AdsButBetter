import { getDb } from '../index';
import { MetricsSnapshot } from '../../models';

interface MetricsRow {
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

function rowToSnapshot(row: MetricsRow): MetricsSnapshot {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityLevel: row.entity_level as MetricsSnapshot['entityLevel'],
    timestamp: row.timestamp,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    leads: row.leads,
    ctr: row.ctr,
    cpc: row.cpc,
    cpl: row.cpl,
    registrationRate: row.registration_rate,
    qualifiedLeads: row.qualified_leads,
    cpql: row.cpql,
    revenue: row.revenue,
    roas: row.roas,
  };
}

export const metricsRepo = {
  insert(snapshot: MetricsSnapshot): void {
    getDb().prepare(`
      INSERT INTO metrics_snapshots (id, entity_id, entity_level, timestamp, spend, impressions, clicks, leads, ctr, cpc, cpl, registration_rate, qualified_leads, cpql, revenue, roas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshot.id, snapshot.entityId, snapshot.entityLevel, snapshot.timestamp,
      snapshot.spend, snapshot.impressions, snapshot.clicks, snapshot.leads,
      snapshot.ctr, snapshot.cpc, snapshot.cpl, snapshot.registrationRate,
      snapshot.qualifiedLeads, snapshot.cpql, snapshot.revenue, snapshot.roas
    );
  },

  getLatest(entityId: string): MetricsSnapshot | undefined {
    const row = getDb().prepare(
      'SELECT * FROM metrics_snapshots WHERE entity_id = ? ORDER BY timestamp DESC LIMIT 1'
    ).get(entityId) as MetricsRow | undefined;
    return row ? rowToSnapshot(row) : undefined;
  },

  getHistory(entityId: string, limit: number = 24): MetricsSnapshot[] {
    const rows = getDb().prepare(
      'SELECT * FROM metrics_snapshots WHERE entity_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(entityId, limit) as MetricsRow[];
    return rows.map(rowToSnapshot);
  },

  deleteAll(): void {
    getDb().prepare('DELETE FROM metrics_snapshots').run();
  },
};
