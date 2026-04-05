import { Campaign } from '../../models';

export interface MockCampaignProfile {
  campaign: Campaign;
  // Base performance characteristics for metric generation
  baseImpressions: number;       // avg impressions per snapshot
  baseCtr: number;               // avg click-through rate
  baseRegistrationRate: number;  // avg leads / clicks (landing page conversion)
  volatility: number;            // 0-1, how much metrics fluctuate
}

const now = new Date().toISOString();

export const MOCK_CAMPAIGNS: MockCampaignProfile[] = [
  {
    campaign: {
      id: 'camp-001',
      name: 'Peptide Setup - Webinar - Broad',
      status: 'active',
      adReviewStatus: 'approved',
      dailyBudget: 500,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 40000,
    baseCtr: 0.02,
    baseRegistrationRate: 0.15,
    volatility: 0.2,
  },
  {
    campaign: {
      id: 'camp-002',
      name: 'Peptide Setup - Webinar - Retargeting',
      status: 'active',
      adReviewStatus: 'approved',
      dailyBudget: 200,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 12000,
    baseCtr: 0.045,
    baseRegistrationRate: 0.25,
    volatility: 0.15,
  },
  {
    campaign: {
      id: 'camp-003',
      name: 'Peptide Setup - Webinar - Lookalike',
      status: 'active',
      adReviewStatus: 'approved',
      dailyBudget: 300,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 30000,
    baseCtr: 0.018,
    baseRegistrationRate: 0.12,
    volatility: 0.25,
  },
  {
    campaign: {
      id: 'camp-004',
      name: 'Peptide Setup - Webinar - Interest Based',
      status: 'active',
      adReviewStatus: 'approved',
      dailyBudget: 400,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 50000,
    baseCtr: 0.015,
    baseRegistrationRate: 0.10,
    volatility: 0.3,
  },
  {
    campaign: {
      id: 'camp-005',
      name: 'Peptide Setup - Webinar - Video Views Retarget',
      status: 'active',
      adReviewStatus: 'approved',
      dailyBudget: 150,
      lifetimeBudget: 2000,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 8000,
    baseCtr: 0.055,
    baseRegistrationRate: 0.30,
    volatility: 0.2,
  },
];
