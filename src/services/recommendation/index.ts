import { Recommendation, TriggeredRule, MetricsSnapshot } from '../../models';
import { randomUUID } from 'crypto';
import { analyzeRecommendation } from '../llm';
import { buildRecommendationContext } from '../llm/context-builder';
import { getApprovalRate } from '../llm/feedback-analyzer';
import { runtimeSettings } from '../../config';
import { logger } from '../../utils/logger';

export async function generateRecommendation(
  triggered: TriggeredRule,
  currentMetrics: MetricsSnapshot
): Promise<Recommendation> {
  const { rule, entityId, entityLevel, conditionResults } = triggered;

  // Default: mathematical confidence + template reasoning
  let confidence = calculateConfidence(triggered);
  const conditionSummary = conditionResults
    .map(cr => `${cr.condition.metric} ${cr.condition.operator} ${cr.condition.threshold} (actual: ${cr.actualValue})`)
    .join('; ');
  let reasoning = `Rule "${rule.name}" triggered: ${conditionSummary}`;

  // Try LLM analysis if enabled
  if (runtimeSettings.aiReasoningEnabled) {
    try {
      const context = buildRecommendationContext(triggered, currentMetrics);
      const analysis = await analyzeRecommendation(context);
      if (analysis) {
        confidence = analysis.confidence;
        reasoning = analysis.reasoning;
        logger.info('Using LLM reasoning', { entityId, rule: rule.name, confidence });
      }
    } catch (err) {
      logger.error('LLM reasoning failed, using fallback', { error: String(err) });
    }
  }

  // Blend in historical approval rate if available
  const approvalRate = getApprovalRate(rule.id);
  if (approvalRate !== null) {
    // Weighted blend: 70% current analysis, 30% historical approval rate
    confidence = Math.round((confidence * 0.7 + approvalRate * 0.3) * 100) / 100;
    reasoning += ` [Historical approval rate for this rule: ${(approvalRate * 100).toFixed(0)}%]`;
  }

  return {
    id: randomUUID(),
    entityId,
    entityLevel,
    action: rule.action,
    actionParams: rule.actionParams,
    confidence,
    reasoning,
    triggeredRuleIds: [rule.id],
    status: 'pending',
    discordMessageId: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  };
}

function calculateConfidence(triggered: TriggeredRule): number {
  const { conditionResults } = triggered;
  const margins = conditionResults.map(cr => {
    const diff = Math.abs(cr.actualValue - cr.condition.threshold);
    const base = Math.abs(cr.condition.threshold) || 1;
    return Math.min(diff / base, 1);
  });

  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  return Math.round(Math.min(0.5 + avgMargin * 0.5, 1) * 100) / 100;
}
