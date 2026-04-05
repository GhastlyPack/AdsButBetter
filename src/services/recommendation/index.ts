import { Recommendation, TriggeredRule } from '../../models';
import { randomUUID } from 'crypto';

export function generateRecommendation(triggered: TriggeredRule): Recommendation {
  const { rule, entityId, entityLevel, conditionResults } = triggered;

  const conditionSummary = conditionResults
    .map(cr => `${cr.condition.metric} ${cr.condition.operator} ${cr.condition.threshold} (actual: ${cr.actualValue})`)
    .join('; ');

  return {
    id: randomUUID(),
    entityId,
    entityLevel,
    action: rule.action,
    actionParams: rule.actionParams,
    confidence: calculateConfidence(triggered),
    reasoning: `Rule "${rule.name}" triggered: ${conditionSummary}`,
    triggeredRuleIds: [rule.id],
    status: 'pending',
    discordMessageId: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  };
}

function calculateConfidence(triggered: TriggeredRule): number {
  // TODO: Improve with historical data and LLM layer
  // For now: base confidence from how far past thresholds the actuals are
  const { conditionResults } = triggered;
  const margins = conditionResults.map(cr => {
    const diff = Math.abs(cr.actualValue - cr.condition.threshold);
    const base = Math.abs(cr.condition.threshold) || 1;
    return Math.min(diff / base, 1);
  });

  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  return Math.round(Math.min(0.5 + avgMargin * 0.5, 1) * 100) / 100;
}
