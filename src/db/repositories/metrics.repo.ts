import { getDb } from '../index';
import { MetricsSnapshot } from '../../models';

export const metricsRepo = {
  insert(snapshot: MetricsSnapshot): void {
    getDb().prepare(`
      INSERT INTO metrics_snapshots (id, entity_id, entity_level, timestamp, spend, impressions, clicks, conversions, revenue, ctr, cpc, cpa, roas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshot.id, snapshot.entityId, snapshot.entityLevel, snapshot.timestamp,
      snapshot.spend, snapshot.impressions, snapshot.clicks, snapshot.conversions, snapshot.revenue,
      snapshot.ctr, snapshot.cpc, snapshot.cpa, snapshot.roas
    );
  },

  getLatest(entityId: string): MetricsSnapshot | undefined {
    return getDb().prepare(
      'SELECT * FROM metrics_snapshots WHERE entity_id = ? ORDER BY timestamp DESC LIMIT 1'
    ).get(entityId) as MetricsSnapshot | undefined;
  },

  getHistory(entityId: string, limit: number = 24): MetricsSnapshot[] {
    return getDb().prepare(
      'SELECT * FROM metrics_snapshots WHERE entity_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(entityId, limit) as MetricsSnapshot[];
  },
};
