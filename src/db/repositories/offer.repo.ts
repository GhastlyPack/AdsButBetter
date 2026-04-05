import { getDb } from '../index';
import { Offer } from '../../models';

interface OfferRow {
  id: string;
  name: string;
  niche: string;
  description: string;
  created_at: string;
  updated_at: string;
}

function rowToOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    name: row.name,
    niche: row.niche,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const offerRepo = {
  findAll(): Offer[] {
    return (getDb().prepare('SELECT * FROM offers ORDER BY created_at DESC').all() as OfferRow[]).map(rowToOffer);
  },

  findById(id: string): Offer | undefined {
    const row = getDb().prepare('SELECT * FROM offers WHERE id = ?').get(id) as OfferRow | undefined;
    return row ? rowToOffer(row) : undefined;
  },

  insert(offer: Offer): void {
    getDb().prepare(`
      INSERT INTO offers (id, name, niche, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(offer.id, offer.name, offer.niche, offer.description, offer.createdAt, offer.updatedAt);
  },

  update(id: string, updates: Partial<Offer>): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.niche !== undefined) { fields.push('niche = ?'); values.push(updates.niche); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    getDb().prepare(`UPDATE offers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM offers WHERE id = ?').run(id);
  },
};
