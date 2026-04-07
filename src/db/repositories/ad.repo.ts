import { getDb } from '../index';
import { Ad } from '../../models';

interface AdRow {
  id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToAd(row: AdRow): Ad {
  return {
    id: row.id,
    adSetId: row.adset_id,
    campaignId: row.campaign_id,
    name: row.name,
    status: row.status as Ad['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const adRepo = {
  findAll(): Ad[] {
    return (getDb().prepare('SELECT * FROM ads').all() as AdRow[]).map(rowToAd);
  },

  findById(id: string): Ad | undefined {
    const row = getDb().prepare('SELECT * FROM ads WHERE id = ?').get(id) as AdRow | undefined;
    return row ? rowToAd(row) : undefined;
  },

  findByAdSet(adSetId: string): Ad[] {
    return (getDb().prepare('SELECT * FROM ads WHERE adset_id = ?').all(adSetId) as AdRow[]).map(rowToAd);
  },

  findByCampaign(campaignId: string): Ad[] {
    return (getDb().prepare('SELECT * FROM ads WHERE campaign_id = ?').all(campaignId) as AdRow[]).map(rowToAd);
  },

  insert(ad: Ad): void {
    getDb().prepare(`
      INSERT INTO ads (id, adset_id, campaign_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      ad.id, ad.adSetId, ad.campaignId, ad.name, ad.status,
      ad.createdAt, ad.updatedAt
    );
  },

  updateStatus(id: string, status: string): void {
    getDb().prepare(`UPDATE ads SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  },
};
