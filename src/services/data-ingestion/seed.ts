import { campaignRepo } from '../../db/repositories/campaign.repo';
import { adsetRepo } from '../../db/repositories/adset.repo';
import { adRepo } from '../../db/repositories/ad.repo';
import { MOCK_CAMPAIGNS, MOCK_ADSETS, MOCK_ADS } from './mock-campaigns';
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

export function seedMockAdSets(): void {
  let seeded = 0;
  for (const profile of MOCK_ADSETS) {
    const existing = adsetRepo.findById(profile.adset.id);
    if (!existing) {
      adsetRepo.insert(profile.adset);
      seeded++;
    }
  }
  if (seeded > 0) {
    logger.info('Seeded mock ad sets', { count: seeded });
  }
}

export function seedMockAds(): void {
  let seeded = 0;
  for (const profile of MOCK_ADS) {
    const existing = adRepo.findById(profile.ad.id);
    if (!existing) {
      adRepo.insert(profile.ad);
      seeded++;
    }
  }
  if (seeded > 0) {
    logger.info('Seeded mock ads', { count: seeded });
  }
}
