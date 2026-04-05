import { Operator, RuleCondition } from '../../models';

type ConditionEvaluator = (actualValue: number, threshold: number) => boolean;

const evaluators: Record<Operator, ConditionEvaluator> = {
  gt: (actual, threshold) => actual > threshold,
  lt: (actual, threshold) => actual < threshold,
  gte: (actual, threshold) => actual >= threshold,
  lte: (actual, threshold) => actual <= threshold,
  eq: (actual, threshold) => actual === threshold,
  delta_gt: (actual, threshold) => actual > threshold,   // actual = % change
  delta_lt: (actual, threshold) => actual < threshold,
};

export function evaluateCondition(condition: RuleCondition, actualValue: number): boolean {
  const evaluator = evaluators[condition.operator];
  return evaluator(actualValue, condition.threshold);
}
