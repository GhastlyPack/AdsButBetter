import { EntityLevel } from './campaign';

export type MetricKey = 'spend' | 'impressions' | 'clicks' | 'leads' | 'ctr' | 'cpc' | 'cpl' | 'registrationRate' | 'qualifiedLeads' | 'cpql' | 'revenue' | 'roas';
export type Operator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'delta_gt' | 'delta_lt';
export type ActionType = 'pause_campaign' | 'start_campaign' | 'increase_budget' | 'decrease_budget';

export interface RuleCondition {
  metric: MetricKey;
  operator: Operator;
  threshold: number;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  entityLevel: EntityLevel;
  conditions: RuleCondition[];    // ALL must be true (AND logic)
  action: ActionType;
  actionParams: Record<string, number>;  // e.g. { percentage: 20 }
  priority: number;                       // higher = evaluated first
  cooldownMinutes: number;                // prevent rapid re-firing
  createdAt: string;
  updatedAt: string;
}

export interface TriggeredRule {
  rule: Rule;
  entityId: string;
  entityLevel: EntityLevel;
  conditionResults: {
    condition: RuleCondition;
    actualValue: number;
    passed: boolean;
  }[];
}
