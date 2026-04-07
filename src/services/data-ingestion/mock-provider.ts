import { randomUUID } from 'crypto';
import { DataProvider } from './index';
import { MetricsSnapshot, EntityLevel } from '../../models';
import { MOCK_CAMPAIGNS, MOCK_ADSETS, MOCK_ADS, MockCampaignProfile, MockAdSetProfile, MockAdProfile } from './mock-campaigns';
import { logger } from '../../utils/logger';

export type AnomalyType = 'spike_cpl' | 'zero_leads' | 'zero_impressions' | 'budget_blowout';

interface AnomalyConfig {
  entityId: string;
  type: AnomalyType;
  duration: number;
  remaining: number;
}

interface PerfProfile {
  baseImpressions: number;
  baseCtr: number;
  baseRegistrationRate: number;
  volatility: number;
  budget: number;
}

export class MockDataProvider implements DataProvider {
  private callCount = 0;
  private anomalies: AnomalyConfig[] = [];

  injectAnomaly(entityId: string, type: AnomalyType, duration: number = 3): void {
    this.anomalies.push({ entityId, type, duration, remaining: duration });
    logger.info('Anomaly injected', { entityId, type, duration });
  }

  async fetchMetrics(entityId: string): Promise<MetricsSnapshot> {
    // Try campaign first, then adset, then ad
    const campaign = MOCK_CAMPAIGNS.find(c => c.campaign.id === entityId);
    if (campaign) {
      this.callCount++;
      return this.generateSnapshot(entityId, 'campaign', {
        baseImpressions: campaign.baseImpressions,
        baseCtr: campaign.baseCtr,
        baseRegistrationRate: campaign.baseRegistrationRate,
        volatility: campaign.volatility,
        budget: campaign.campaign.dailyBudget,
      });
    }
    const adset = MOCK_ADSETS.find(a => a.adset.id === entityId);
    if (adset) {
      this.callCount++;
      return this.generateSnapshot(entityId, 'adset', {
        baseImpressions: adset.baseImpressions,
        baseCtr: adset.baseCtr,
        baseRegistrationRate: adset.baseRegistrationRate,
        volatility: adset.volatility,
        budget: adset.adset.dailyBudget,
      });
    }
    const ad = MOCK_ADS.find(a => a.ad.id === entityId);
    if (ad) {
      this.callCount++;
      // Ads don't have their own budget — derive proportional spend from impressions
      const adset = MOCK_ADSETS.find(s => s.adset.id === ad.ad.adSetId);
      const budget = adset ? adset.adset.dailyBudget : 100;
      return this.generateSnapshot(entityId, 'ad', {
        baseImpressions: ad.baseImpressions,
        baseCtr: ad.baseCtr,
        baseRegistrationRate: ad.baseRegistrationRate,
        volatility: ad.volatility,
        budget,
      });
    }
    throw new Error(`No mock entity found for ${entityId}`);
  }

  async fetchAllMetrics(): Promise<MetricsSnapshot[]> {
    this.callCount++;
    return MOCK_CAMPAIGNS
      .filter(c => c.campaign.status === 'active')
      .map(profile => this.generateSnapshot(profile.campaign.id, 'campaign', {
        baseImpressions: profile.baseImpressions,
        baseCtr: profile.baseCtr,
        baseRegistrationRate: profile.baseRegistrationRate,
        volatility: profile.volatility,
        budget: profile.campaign.dailyBudget,
      }));
  }

  async fetchAllAdSetMetrics(): Promise<MetricsSnapshot[]> {
    return MOCK_ADSETS
      .filter(a => a.adset.status === 'active')
      .map(profile => this.generateSnapshot(profile.adset.id, 'adset', {
        baseImpressions: profile.baseImpressions,
        baseCtr: profile.baseCtr,
        baseRegistrationRate: profile.baseRegistrationRate,
        volatility: profile.volatility,
        budget: profile.adset.dailyBudget,
      }));
  }

  async fetchAllAdMetrics(): Promise<MetricsSnapshot[]> {
    return MOCK_ADS
      .filter(a => a.ad.status === 'active')
      .map(profile => {
        const adset = MOCK_ADSETS.find(s => s.adset.id === profile.ad.adSetId);
        const budget = adset ? adset.adset.dailyBudget : 100;
        return this.generateSnapshot(profile.ad.id, 'ad', {
          baseImpressions: profile.baseImpressions,
          baseCtr: profile.baseCtr,
          baseRegistrationRate: profile.baseRegistrationRate,
          volatility: profile.volatility,
          budget,
        });
      });
  }

  getCampaigns(): MockCampaignProfile[] {
    return MOCK_CAMPAIGNS;
  }

  private generateSnapshot(entityId: string, entityLevel: EntityLevel, profile: PerfProfile): MetricsSnapshot {
    const anomaly = this.getActiveAnomaly(entityId);
    const raw = this.generateRawMetrics(profile, anomaly);

    const ctr = raw.impressions > 0 ? raw.clicks / raw.impressions : 0;
    const cpc = raw.clicks > 0 ? raw.spend / raw.clicks : 0;
    const cpl = raw.leads > 0 ? raw.spend / raw.leads : (raw.spend > 0 ? 99999 : 0);
    const registrationRate = raw.clicks > 0 ? raw.leads / raw.clicks : 0;

    return {
      id: randomUUID(),
      entityId,
      entityLevel,
      timestamp: new Date().toISOString(),
      spend: round(raw.spend),
      impressions: Math.round(raw.impressions),
      clicks: Math.round(raw.clicks),
      leads: Math.round(raw.leads),
      ctr: round(ctr, 4),
      cpc: round(cpc),
      cpl: round(cpl),
      registrationRate: round(registrationRate, 4),
      qualifiedLeads: null,
      cpql: null,
      revenue: null,
      roas: null,
    };
  }

  private generateRawMetrics(
    profile: PerfProfile,
    anomaly: AnomalyConfig | null
  ): { spend: number; impressions: number; clicks: number; leads: number } {
    const { baseImpressions, baseCtr, baseRegistrationRate, volatility, budget } = profile;

    let impressions = vary(baseImpressions, volatility);
    let clicks = Math.round(impressions * vary(baseCtr, volatility));
    let leads = Math.round(clicks * vary(baseRegistrationRate, volatility));
    let spend = Math.min(budget, (impressions / baseImpressions) * budget * vary(1, 0.1));

    if (anomaly) {
      switch (anomaly.type) {
        case 'spike_cpl':
          leads = Math.max(1, Math.round(leads * 0.05));
          break;
        case 'zero_leads':
          leads = 0;
          break;
        case 'zero_impressions':
          impressions = 0;
          clicks = 0;
          leads = 0;
          spend = 0;
          break;
        case 'budget_blowout':
          spend = budget * vary(1.8, 0.2);
          impressions = impressions * 2;
          clicks = Math.round(clicks * 1.5);
          break;
      }
    }

    return {
      spend: Math.max(0, spend),
      impressions: Math.max(0, impressions),
      clicks: Math.max(0, Math.min(clicks, impressions)),
      leads: Math.max(0, Math.min(leads, clicks)),
    };
  }

  private getActiveAnomaly(entityId: string): AnomalyConfig | null {
    const idx = this.anomalies.findIndex(a => a.entityId === entityId && a.remaining > 0);
    if (idx === -1) return null;

    const anomaly = this.anomalies[idx];
    anomaly.remaining--;

    if (anomaly.remaining <= 0) {
      this.anomalies.splice(idx, 1);
      logger.info('Anomaly expired', { entityId, type: anomaly.type });
    }

    return anomaly;
  }
}

function vary(base: number, volatility: number): number {
  const factor = 1 + (Math.random() * 2 - 1) * volatility;
  return base * factor;
}

function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
