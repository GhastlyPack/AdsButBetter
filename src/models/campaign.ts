export type EntityLevel = 'campaign' | 'adset' | 'ad';
export type CampaignStatus = 'active' | 'paused' | 'archived';
export type AdReviewStatus = 'approved' | 'pending' | 'declined' | 'unknown';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  adReviewStatus: AdReviewStatus;
  offerId: string | null;
  dailyBudget: number;
  lifetimeBudget: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  name: string;
  niche: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: CampaignStatus;
  dailyBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ad {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}
