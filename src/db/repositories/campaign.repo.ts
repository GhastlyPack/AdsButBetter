import { getDb } from '../index';
import { Campaign } from '../../models';

export const campaignRepo = {
  findAll(): Campaign[] {
    return getDb().prepare('SELECT * FROM campaigns').all() as Campaign[];
  },

  findById(id: string): Campaign | undefined {
    return getDb().prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Campaign | undefined;
  },

  insert(campaign: Campaign): void {
    getDb().prepare(`
      INSERT INTO campaigns (id, name, status, daily_budget, lifetime_budget, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaign.id, campaign.name, campaign.status,
      campaign.dailyBudget, campaign.lifetimeBudget,
      campaign.createdAt, campaign.updatedAt
    );
  },

  updateStatus(id: string, status: string): void {
    getDb().prepare('UPDATE campaigns SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, id);
  },

  updateBudget(id: string, dailyBudget: number): void {
    getDb().prepare('UPDATE campaigns SET daily_budget = ?, updated_at = datetime("now") WHERE id = ?').run(dailyBudget, id);
  },
};
