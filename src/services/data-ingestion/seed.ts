import { campaignRepo } from '../../db/repositories/campaign.repo';
import { MOCK_CAMPAIGNS } from './mock-campaigns';
import { logger } from '../../utils/logger';

export function seedMockCampaigns(): void {
  let seeded = 0;
  for (const profile of MOCK_CAMPAIGNS) {
    const existing = campaignRepo.findById(profile.campaign.id);
    if (!existing) {
      campaignRepo.insert(profile.campaign);
      seeded++;
    }
  }
  if (seeded > 0) {
    logger.info('Seeded mock campaigns', { count: seeded });
  }
}
