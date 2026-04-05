import { ActionType } from './rule';
import { EntityLevel } from './campaign';

export type RecommendationStatus = 'pending' | 'approved' | 'denied' | 'executed' | 'expired';

export interface Recommendation {
  id: string;
  entityId: string;
  entityLevel: EntityLevel;
  action: ActionType;
  actionParams: Record<string, number>;
  confidence: number;           // 0-1
  reasoning: string;
  triggeredRuleIds: string[];
  status: RecommendationStatus;
  discordMessageId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;    // Discord user ID
}
