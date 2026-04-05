import { Campaign } from '../../models';

export interface MockCampaignProfile {
  campaign: Campaign;
  // Base performance characteristics for metric generation
  baseImpressions: number;    // avg impressions per snapshot
  baseCtr: number;            // avg click-through rate
  baseConversionRate: number; // avg conversion rate (of clicks)
  baseRevenuePerConversion: number;
  volatility: number;         // 0-1, how much metrics fluctuate
}

const now = new Date().toISOString();

export const MOCK_CAMPAIGNS: MockCampaignProfile[] = [
  {
    campaign: {
      id: 'camp-001',
      name: 'Summer Sale - Broad',
      status: 'active',
      dailyBudget: 500,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 50000,
    baseCtr: 0.025,
    baseConversionRate: 0.04,
    baseRevenuePerConversion: 45,
    volatility: 0.2,
  },
  {
    campaign: {
      id: 'camp-002',
      name: 'Retargeting - Cart Abandoners',
      status: 'active',
      dailyBudget: 200,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 15000,
    baseCtr: 0.045,
    baseConversionRate: 0.08,
    baseRevenuePerConversion: 60,
    volatility: 0.15,
  },
  {
    campaign: {
      id: 'camp-003',
      name: 'Brand Awareness - Video',
      status: 'active',
      dailyBudget: 300,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 100000,
    baseCtr: 0.008,
    baseConversionRate: 0.01,
    baseRevenuePerConversion: 30,
    volatility: 0.3,
  },
  {
    campaign: {
      id: 'camp-004',
      name: 'Lookalike - High Value',
      status: 'active',
      dailyBudget: 400,
      lifetimeBudget: null,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 35000,
    baseCtr: 0.032,
    baseConversionRate: 0.05,
    baseRevenuePerConversion: 75,
    volatility: 0.25,
  },
  {
    campaign: {
      id: 'camp-005',
      name: 'Promo - Flash Deal',
      status: 'active',
      dailyBudget: 150,
      lifetimeBudget: 2000,
      createdAt: now,
      updatedAt: now,
    },
    baseImpressions: 20000,
    baseCtr: 0.05,
    baseConversionRate: 0.06,
    baseRevenuePerConversion: 25,
    volatility: 0.4,
  },
];
