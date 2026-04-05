import { randomUUID } from 'crypto';
import { DataProvider } from './index';
import { MetricsSnapshot } from '../../models';
import { MOCK_CAMPAIGNS, MockCampaignProfile } from './mock-campaigns';
import { logger } from '../../utils/logger';

export type AnomalyType = 'spike_cpl' | 'zero_leads' | 'zero_impressions' | 'budget_blowout';

interface AnomalyConfig {
  campaignId: string;
  type: AnomalyType;
  duration: number;
  remaining: number;
}

export class MockDataProvider implements DataProvider {
  private callCount = 0;
  private anomalies: AnomalyConfig[] = [];

  injectAnomaly(campaignId: string, type: AnomalyType, duration: number = 3): void {
    this.anomalies.push({ campaignId, type, duration, remaining: duration });
    logger.info('Anomaly injected', { campaignId, type, duration });
  }

  async fetchMetrics(entityId: string): Promise<MetricsSnapshot> {
    const profile = MOCK_CAMPAIGNS.find(c => c.campaign.id === entityId);
    if (!profile) {
      throw new Error(`No mock campaign found for entity ${entityId}`);
    }
    this.callCount++;
    return this.generateSnapshot(profile);
  }

  async fetchAllMetrics(): Promise<MetricsSnapshot[]> {
    this.callCount++;
    return MOCK_CAMPAIGNS
      .filter(c => c.campaign.status === 'active')
      .map(profile => this.generateSnapshot(profile));
  }

  getCampaigns(): MockCampaignProfile[] {
    return MOCK_CAMPAIGNS;
  }

  private generateSnapshot(profile: MockCampaignProfile): MetricsSnapshot {
    const anomaly = this.getActiveAnomaly(profile.campaign.id);
    const raw = this.generateRawMetrics(profile, anomaly);

    const ctr = raw.impressions > 0 ? raw.clicks / raw.impressions : 0;
    const cpc = raw.clicks > 0 ? raw.spend / raw.clicks : 0;
    const cpl = raw.leads > 0 ? raw.spend / raw.leads : (raw.spend > 0 ? 99999 : 0);
    const registrationRate = raw.clicks > 0 ? raw.leads / raw.clicks : 0;

    return {
      id: randomUUID(),
      entityId: profile.campaign.id,
      entityLevel: 'campaign',
      timestamp: new Date().toISOString(),
      spend: round(raw.spend),
      impressions: Math.round(raw.impressions),
      clicks: Math.round(raw.clicks),
      leads: Math.round(raw.leads),
      ctr: round(ctr, 4),
      cpc: round(cpc),
      cpl: round(cpl),
      registrationRate: round(registrationRate, 4),
      // GHL integration fields — null until connected
      qualifiedLeads: null,
      cpql: null,
      revenue: null,
      roas: null,
    };
  }

  private generateRawMetrics(
    profile: MockCampaignProfile,
    anomaly: AnomalyConfig | null
  ): { spend: number; impressions: number; clicks: number; leads: number } {
    const { baseImpressions, baseCtr, baseRegistrationRate, volatility } = profile;
    const budget = profile.campaign.dailyBudget;

    let impressions = vary(baseImpressions, volatility);
    let clicks = Math.round(impressions * vary(baseCtr, volatility));
    let leads = Math.round(clicks * vary(baseRegistrationRate, volatility));
    let spend = Math.min(budget, (impressions / baseImpressions) * budget * vary(1, 0.1));

    if (anomaly) {
      switch (anomaly.type) {
        case 'spike_cpl':
          // Leads tank but spend stays high → CPL spikes
          leads = Math.max(1, Math.round(leads * 0.05));
          break;
        case 'zero_leads':
          // Getting clicks but no registrations
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

  private getActiveAnomaly(campaignId: string): AnomalyConfig | null {
    const idx = this.anomalies.findIndex(a => a.campaignId === campaignId && a.remaining > 0);
    if (idx === -1) return null;

    const anomaly = this.anomalies[idx];
    anomaly.remaining--;

    if (anomaly.remaining <= 0) {
      this.anomalies.splice(idx, 1);
      logger.info('Anomaly expired', { campaignId, type: anomaly.type });
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
