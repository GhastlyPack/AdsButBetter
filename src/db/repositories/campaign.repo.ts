import { getDb } from '../index';
import { Campaign } from '../../models';

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  ad_review_status: string;
  offer_id: string | null;
  daily_budget: number;
  lifetime_budget: number | null;
  created_at: string;
  updated_at: string;
}

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    status: row.status as Campaign['status'],
    adReviewStatus: row.ad_review_status as Campaign['adReviewStatus'],
    offerId: row.offer_id,
    dailyBudget: row.daily_budget,
    lifetimeBudget: row.lifetime_budget,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const campaignRepo = {
  findAll(): Campaign[] {
    return (getDb().prepare('SELECT * FROM campaigns').all() as CampaignRow[]).map(rowToCampaign);
  },

  findById(id: string): Campaign | undefined {
    const row = getDb().prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as CampaignRow | undefined;
    return row ? rowToCampaign(row) : undefined;
  },

  findByOffer(offerId: string): Campaign[] {
    return (getDb().prepare('SELECT * FROM campaigns WHERE offer_id = ?').all(offerId) as CampaignRow[]).map(rowToCampaign);
  },

  insert(campaign: Campaign): void {
    getDb().prepare(`
      INSERT INTO campaigns (id, name, status, ad_review_status, offer_id, daily_budget, lifetime_budget, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaign.id, campaign.name, campaign.status, campaign.adReviewStatus,
      campaign.offerId, campaign.dailyBudget, campaign.lifetimeBudget,
      campaign.createdAt, campaign.updatedAt
    );
  },

  updateStatus(id: string, status: string): void {
    getDb().prepare(`UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  },

  updateBudget(id: string, dailyBudget: number): void {
    getDb().prepare(`UPDATE campaigns SET daily_budget = ?, updated_at = datetime('now') WHERE id = ?`).run(dailyBudget, id);
  },

  updateAdReviewStatus(id: string, adReviewStatus: string): void {
    getDb().prepare(`UPDATE campaigns SET ad_review_status = ?, updated_at = datetime('now') WHERE id = ?`).run(adReviewStatus, id);
  },

  updateOffer(id: string, offerId: string | null): void {
    getDb().prepare(`UPDATE campaigns SET offer_id = ?, updated_at = datetime('now') WHERE id = ?`).run(offerId, id);
  },
};
