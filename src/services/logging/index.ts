import { DecisionLog, Recommendation, MetricsSnapshot } from '../../models';
import { randomUUID } from 'crypto';

export function createDecisionLog(
  recommendation: Recommendation,
  metricsBefore: MetricsSnapshot
): DecisionLog {
  return {
    id: randomUUID(),
    recommendationId: recommendation.id,
    entityId: recommendation.entityId,
    entityLevel: recommendation.entityLevel,
    action: recommendation.action,
    actionParams: recommendation.actionParams,
    status: recommendation.status,
    confidence: recommendation.confidence,
    reasoning: recommendation.reasoning,
    triggeredRuleIds: recommendation.triggeredRuleIds,
    resolvedBy: recommendation.resolvedBy,
    metricsBefore: {
      spend: metricsBefore.spend,
      impressions: metricsBefore.impressions,
      clicks: metricsBefore.clicks,
      conversions: metricsBefore.conversions,
      revenue: metricsBefore.revenue,
      ctr: metricsBefore.ctr,
      cpc: metricsBefore.cpc,
      cpa: metricsBefore.cpa,
      roas: metricsBefore.roas,
    },
    metricsAfter: null,
    executedAt: null,
    createdAt: new Date().toISOString(),
  };
}
