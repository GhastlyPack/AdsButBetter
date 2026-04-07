import { getDb } from '../index';
import { AdSet } from '../../models';

interface AdSetRow {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget: number;
  created_at: string;
  updated_at: string;
}

function rowToAdSet(row: AdSetRow): AdSet {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    status: row.status as AdSet['status'],
    dailyBudget: row.daily_budget,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const adsetRepo = {
  findAll(): AdSet[] {
    return (getDb().prepare('SELECT * FROM adsets').all() as AdSetRow[]).map(rowToAdSet);
  },

  findById(id: string): AdSet | undefined {
    const row = getDb().prepare('SELECT * FROM adsets WHERE id = ?').get(id) as AdSetRow | undefined;
    return row ? rowToAdSet(row) : undefined;
  },

  findByCampaign(campaignId: string): AdSet[] {
    return (getDb().prepare('SELECT * FROM adsets WHERE campaign_id = ?').all(campaignId) as AdSetRow[]).map(rowToAdSet);
  },

  insert(adset: AdSet): void {
    getDb().prepare(`
      INSERT INTO adsets (id, campaign_id, name, status, daily_budget, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      adset.id, adset.campaignId, adset.name, adset.status,
      adset.dailyBudget, adset.createdAt, adset.updatedAt
    );
  },

  updateStatus(id: string, status: string): void {
    getDb().prepare(`UPDATE adsets SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  },

  updateBudget(id: string, dailyBudget: number): void {
    getDb().prepare(`UPDATE adsets SET daily_budget = ?, updated_at = datetime('now') WHERE id = ?`).run(dailyBudget, id);
  },
};
