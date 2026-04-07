import { Campaign, AdSet, Ad } from '../../models';

export interface MockCampaignProfile {
  campaign: Campaign;
  // Base performance characteristics for metric generation
  baseImpressions: number;       // avg impressions per snapshot
  baseCtr: number;               // avg click-through rate
  baseRegistrationRate: number;  // avg leads / clicks (landing page conversion)
  volatility: number;            // 0-1, how much metrics fluctuate
}

export interface MockAdSetProfile {
  adset: AdSet;
  baseImpressions: number;
  baseCtr: number;
  baseRegistrationRate: number;
  volatility: number;
}

export interface MockAdProfile {
  ad: Ad;
  baseImpressions: number;
  baseCtr: number;
  baseRegistrationRate: number;
  volatility: number;
}

const now = new Date().toISOString();

export const MOCK_CAMPAIGNS: MockCampaignProfile[] = [
  {
    campaign: {
      id: 'camp-001',
      name: 'Peptide Setup - Webinar - Broad',
      status: 'active',
      adReviewStatus: 'approved',
      offerId: null,
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
      offerId: null,
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
      offerId: null,
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
      offerId: null,
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
      offerId: null,
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

// Helper to build a mock adset profile
function buildAdSet(
  id: string, campaignId: string, name: string, dailyBudget: number,
  baseImpressions: number, baseCtr: number, baseRegistrationRate: number, volatility: number
): MockAdSetProfile {
  return {
    adset: {
      id, campaignId, name, status: 'active', dailyBudget,
      createdAt: now, updatedAt: now,
    },
    baseImpressions, baseCtr, baseRegistrationRate, volatility,
  };
}

function buildAd(
  id: string, adSetId: string, campaignId: string, name: string,
  baseImpressions: number, baseCtr: number, baseRegistrationRate: number, volatility: number
): MockAdProfile {
  return {
    ad: {
      id, adSetId, campaignId, name, status: 'active',
      createdAt: now, updatedAt: now,
    },
    baseImpressions, baseCtr, baseRegistrationRate, volatility,
  };
}

// Mock ad sets — 2-3 per campaign with varying performance
export const MOCK_ADSETS: MockAdSetProfile[] = [
  // camp-001: Broad
  buildAdSet('adset-001-a', 'camp-001', 'Broad - Lookalike 1%', 200, 16000, 0.022, 0.16, 0.18),
  buildAdSet('adset-001-b', 'camp-001', 'Broad - Lookalike 3%', 180, 14000, 0.019, 0.14, 0.22),
  buildAdSet('adset-001-c', 'camp-001', 'Broad - Interest Stack', 120, 10000, 0.018, 0.13, 0.25),
  // camp-002: Retargeting
  buildAdSet('adset-002-a', 'camp-002', 'RT - Page Visitors', 120, 7000, 0.05, 0.27, 0.13),
  buildAdSet('adset-002-b', 'camp-002', 'RT - Cart Abandoners', 80, 5000, 0.04, 0.23, 0.18),
  // camp-003: Lookalike
  buildAdSet('adset-003-a', 'camp-003', 'LAL - Top Customers 1%', 150, 14000, 0.02, 0.13, 0.22),
  buildAdSet('adset-003-b', 'camp-003', 'LAL - Top Customers 5%', 150, 16000, 0.016, 0.11, 0.27),
  // camp-004: Interest Based
  buildAdSet('adset-004-a', 'camp-004', 'Interest - Health & Wellness', 200, 25000, 0.016, 0.10, 0.28),
  buildAdSet('adset-004-b', 'camp-004', 'Interest - Entrepreneurs', 200, 25000, 0.014, 0.10, 0.30),
  // camp-005: Video Views Retarget
  buildAdSet('adset-005-a', 'camp-005', 'VV75% - Last 30 days', 80, 4000, 0.058, 0.32, 0.18),
  buildAdSet('adset-005-b', 'camp-005', 'VV50% - Last 14 days', 70, 4000, 0.052, 0.28, 0.20),
];

// Mock ads — 2-3 per ad set
export const MOCK_ADS: MockAdProfile[] = [
  // adset-001-a
  buildAd('ad-001-a-1', 'adset-001-a', 'camp-001', 'Hook A - Static', 8000, 0.023, 0.17, 0.18),
  buildAd('ad-001-a-2', 'adset-001-a', 'camp-001', 'Hook B - Carousel', 8000, 0.021, 0.15, 0.20),
  // adset-001-b
  buildAd('ad-001-b-1', 'adset-001-b', 'camp-001', 'UGC Testimonial', 7000, 0.020, 0.15, 0.20),
  buildAd('ad-001-b-2', 'adset-001-b', 'camp-001', 'Demo Video 30s', 7000, 0.018, 0.13, 0.24),
  // adset-001-c
  buildAd('ad-001-c-1', 'adset-001-c', 'camp-001', 'Founder Story', 10000, 0.018, 0.13, 0.25),
  // adset-002-a
  buildAd('ad-002-a-1', 'adset-002-a', 'camp-002', 'Limited Spots Reminder', 4000, 0.052, 0.28, 0.13),
  buildAd('ad-002-a-2', 'adset-002-a', 'camp-002', 'Webinar Replay', 3000, 0.048, 0.26, 0.15),
  // adset-002-b
  buildAd('ad-002-b-1', 'adset-002-b', 'camp-002', 'Cart Recovery', 5000, 0.04, 0.23, 0.18),
  // adset-003-a
  buildAd('ad-003-a-1', 'adset-003-a', 'camp-003', 'Authority Build', 7000, 0.021, 0.14, 0.22),
  buildAd('ad-003-a-2', 'adset-003-a', 'camp-003', 'Case Study', 7000, 0.019, 0.12, 0.24),
  // adset-003-b
  buildAd('ad-003-b-1', 'adset-003-b', 'camp-003', 'Social Proof', 16000, 0.016, 0.11, 0.27),
  // adset-004-a
  buildAd('ad-004-a-1', 'adset-004-a', 'camp-004', 'Wellness Hook', 12000, 0.016, 0.10, 0.28),
  buildAd('ad-004-a-2', 'adset-004-a', 'camp-004', 'Health Stats', 13000, 0.015, 0.09, 0.30),
  // adset-004-b
  buildAd('ad-004-b-1', 'adset-004-b', 'camp-004', 'Entrepreneur Story', 25000, 0.014, 0.10, 0.30),
  // adset-005-a
  buildAd('ad-005-a-1', 'adset-005-a', 'camp-005', 'VV - Hook 1', 4000, 0.058, 0.32, 0.18),
  // adset-005-b
  buildAd('ad-005-b-1', 'adset-005-b', 'camp-005', 'VV - Hook 2', 4000, 0.052, 0.28, 0.20),
];
