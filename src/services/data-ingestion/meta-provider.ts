import { randomUUID } from 'crypto';
import { DataProvider } from './index';
import { MetricsSnapshot } from '../../models';
import { logger } from '../../utils/logger';

interface MetaConfig {
  accessToken: string;
  adAccountId: string;
}

export class MetaDataProvider implements DataProvider {
  private config: MetaConfig;

  constructor(config: MetaConfig) {
    this.config = config;
  }

  async fetchMetrics(entityId: string): Promise<MetricsSnapshot> {
    const data = await this.callMetaApi(entityId);
    return this.mapToSnapshot(entityId, data);
  }

  async fetchAllMetrics(): Promise<MetricsSnapshot[]> {
    const campaigns = await this.fetchCampaigns();
    const snapshots: MetricsSnapshot[] = [];

    for (const campaign of campaigns) {
      try {
        const snapshot = await this.fetchMetrics(campaign.id);
        snapshots.push(snapshot);
      } catch (err) {
        logger.error('Failed to fetch metrics for campaign', { campaignId: campaign.id, error: String(err) });
      }
    }

    return snapshots;
  }

  async fetchCampaigns(): Promise<{ id: string; name: string; status: string; dailyBudget: number }[]> {
    const url = `https://graph.facebook.com/v21.0/act_${this.config.adAccountId}/campaigns?fields=id,name,status,daily_budget&access_token=${this.config.accessToken}`;
    const res = await fetch(url);
    const data: any = await res.json();

    if (data.error) {
      logger.error('Meta API error (campaigns)', { error: data.error.message });
      throw new Error(`Meta API: ${data.error.message}`);
    }

    return (data.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status.toLowerCase(),
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : 0, // Meta returns cents
    }));
  }

  private async callMetaApi(campaignId: string): Promise<any> {
    const url = `https://graph.facebook.com/v21.0/${campaignId}/insights?fields=spend,impressions,clicks,actions,cost_per_action_type,ctr,cpc&date_preset=today&access_token=${this.config.accessToken}`;
    const res = await fetch(url);
    const data: any = await res.json();

    if (data.error) {
      logger.error('Meta API error (insights)', { campaignId, error: data.error.message });
      throw new Error(`Meta API: ${data.error.message}`);
    }

    return data.data?.[0] || {};
  }

  private mapToSnapshot(entityId: string, data: any): MetricsSnapshot {
    const spend = Number(data.spend || 0);
    const impressions = Number(data.impressions || 0);
    const clicks = Number(data.clicks || 0);

    // Extract leads from actions array
    const actions = data.actions || [];
    const leadAction = actions.find((a: any) =>
      a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
    );
    const leads = leadAction ? Number(leadAction.value) : 0;

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpl = leads > 0 ? spend / leads : (spend > 0 ? 99999 : 0);
    const registrationRate = clicks > 0 ? leads / clicks : 0;

    return {
      id: randomUUID(),
      entityId,
      entityLevel: 'campaign',
      timestamp: new Date().toISOString(),
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      leads,
      ctr: Math.round(ctr * 10000) / 10000,
      cpc: Math.round(cpc * 100) / 100,
      cpl: Math.round(cpl * 100) / 100,
      registrationRate: Math.round(registrationRate * 10000) / 10000,
      qualifiedLeads: null,
      cpql: null,
      revenue: null,
      roas: null,
    };
  }

  updateConfig(config: Partial<MetaConfig>): void {
    if (config.accessToken) this.config.accessToken = config.accessToken;
    if (config.adAccountId) this.config.adAccountId = config.adAccountId;
  }
}
