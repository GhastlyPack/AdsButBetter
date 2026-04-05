import { MetricsSnapshot, Rule, TriggeredRule } from '../../models';
import { evaluateCondition } from './conditions';

export function evaluateRules(metrics: MetricsSnapshot, rules: Rule[]): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];

  const applicableRules = rules
    .filter(r => r.enabled && r.entityLevel === metrics.entityLevel)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of applicableRules) {
    const conditionResults = rule.conditions.map(condition => {
      const actualValue = metrics[condition.metric as keyof MetricsSnapshot] as number;
      return {
        condition,
        actualValue,
        passed: evaluateCondition(condition, actualValue),
      };
    });

    const allPassed = conditionResults.every(r => r.passed);

    if (allPassed) {
      triggered.push({
        rule,
        entityId: metrics.entityId,
        entityLevel: metrics.entityLevel,
        conditionResults,
      });
    }
  }

  return triggered;
}
