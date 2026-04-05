import { TriggeredRule, MetricsSnapshot, Campaign } from '../../models';
import { metricsRepo } from '../../db/repositories/metrics.repo';
import { recommendationRepo } from '../../db/repositories/recommendation.repo';
import { campaignRepo } from '../../db/repositories/campaign.repo';
import { offerRepo } from '../../db/repositories/offer.repo';

export interface RecommendationContext {
  campaign: {
    id: string;
    name: string;
    status: string;
    dailyBudget: number;
    offerName: string | null;
    offerNiche: string | null;
  };
  currentMetrics: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    ctr: number;
    cpc: number;
    cpl: number;
    registrationRate: number;
  };
  metricsHistory: {
    spend: number;
    leads: number;
    cpl: number;
    ctr: number;
    cpc: number;
    timestamp: string;
  }[];
  rule: {
    name: string;
    description: string;
    action: string;
    actionParams: Record<string, number>;
    conditions: { metric: string; operator: string; threshold: number; actualValue: number }[];
  };
  historicalDecisions: {
    action: string;
    status: string;
    confidence: number;
    createdAt: string;
  }[];
}

export function buildRecommendationContext(
  triggered: TriggeredRule,
  currentMetrics: MetricsSnapshot
): RecommendationContext {
  const campaign = campaignRepo.findById(triggered.entityId);
  let offerName: string | null = null;
  let offerNiche: string | null = null;

  if (campaign?.offerId) {
    const offer = offerRepo.findById(campaign.offerId);
    if (offer) {
      offerName = offer.name;
      offerNiche = offer.niche;
    }
  }

  // Get metrics history (last 10 snapshots)
  const history = metricsRepo.getHistory(triggered.entityId, 10);

  // Get recent decisions for this campaign
  const recentRecs = recommendationRepo.findRecent(20);
  const campaignDecisions = recentRecs
    .filter((r: any) => {
      const entityId = r.entity_id || r.entityId;
      return entityId === triggered.entityId;
    })
    .slice(0, 10)
    .map((r: any) => ({
      action: r.action,
      status: r.status,
      confidence: r.confidence,
      createdAt: r.created_at || r.createdAt,
    }));

  return {
    campaign: {
      id: triggered.entityId,
      name: campaign?.name || triggered.entityId,
      status: campaign?.status || 'unknown',
      dailyBudget: campaign?.dailyBudget || 0,
      offerName,
      offerNiche,
    },
    currentMetrics: {
      spend: currentMetrics.spend,
      impressions: currentMetrics.impressions,
      clicks: currentMetrics.clicks,
      leads: currentMetrics.leads,
      ctr: currentMetrics.ctr,
      cpc: currentMetrics.cpc,
      cpl: currentMetrics.cpl < 99999 ? currentMetrics.cpl : 0,
      registrationRate: currentMetrics.registrationRate,
    },
    metricsHistory: history.map(m => ({
      spend: m.spend,
      leads: m.leads,
      cpl: m.cpl < 99999 ? m.cpl : 0,
      ctr: m.ctr,
      cpc: m.cpc,
      timestamp: m.timestamp,
    })),
    rule: {
      name: triggered.rule.name,
      description: triggered.rule.description,
      action: triggered.rule.action,
      actionParams: triggered.rule.actionParams,
      conditions: triggered.conditionResults.map(cr => ({
        metric: cr.condition.metric,
        operator: cr.condition.operator,
        threshold: cr.condition.threshold,
        actualValue: cr.actualValue,
      })),
    },
    historicalDecisions: campaignDecisions,
  };
}
