import { ActionType } from './rule';
import { EntityLevel } from './campaign';
import { RecommendationStatus } from './recommendation';

export interface DecisionLog {
  id: string;
  recommendationId: string;
  entityId: string;
  entityLevel: EntityLevel;
  action: ActionType;
  actionParams: Record<string, number>;
  status: RecommendationStatus;
  confidence: number;
  reasoning: string;
  triggeredRuleIds: string[];
  resolvedBy: string | null;

  // Snapshot of metrics at decision time
  metricsBefore: Record<string, number>;
  metricsAfter: Record<string, number> | null;  // filled by post-change evaluator

  executedAt: string | null;
  createdAt: string;
}
