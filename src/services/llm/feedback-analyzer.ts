import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { feedbackRepo, FeedbackStats, RuleSuggestion } from '../../db/repositories/feedback.repo';
import { recommendationRepo } from '../../db/repositories/recommendation.repo';
import { ruleRepo } from '../../db/repositories/rule.repo';
import { campaignRepo } from '../../db/repositories/campaign.repo';
import { metricsRepo } from '../../db/repositories/metrics.repo';
import { offerRepo } from '../../db/repositories/offer.repo';
import { logger } from '../../utils/logger';

export function analyzeDecisionHistory(): FeedbackStats[] {
  const allRecs = recommendationRepo.findRecent(500);
  const ruleStats: Record<string, { triggered: number; approved: number; denied: number; executed: number }> = {};

  for (const rec of allRecs) {
    const raw = (rec as any).triggered_rule_ids || (rec as any).triggeredRuleIds || '[]';
    const ruleIds = typeof raw === 'string' ? JSON.parse(raw) : raw;

    for (const ruleId of ruleIds) {
      if (!ruleStats[ruleId]) {
        ruleStats[ruleId] = { triggered: 0, approved: 0, denied: 0, executed: 0 };
      }
      ruleStats[ruleId].triggered++;
      const status = rec.status;
      if (status === 'approved') ruleStats[ruleId].approved++;
      if (status === 'denied') ruleStats[ruleId].denied++;
      if (status === 'executed') {
        ruleStats[ruleId].executed++;
        ruleStats[ruleId].approved++;
      }
    }
  }

  const now = new Date().toISOString();
  const results: FeedbackStats[] = [];

  for (const [ruleId, stats] of Object.entries(ruleStats)) {
    const decided = stats.approved + stats.denied;
    const approvalRate = decided > 0 ? Math.round(stats.approved / decided * 100) / 100 : 0;

    const feedbackStat: FeedbackStats = {
      ruleId,
      totalTriggered: stats.triggered,
      totalApproved: stats.approved,
      totalDenied: stats.denied,
      totalExecuted: stats.executed,
      approvalRate,
      lastAnalyzed: now,
    };

    feedbackRepo.upsertStats(feedbackStat);
    results.push(feedbackStat);
  }

  logger.info('Feedback analysis complete', { rulesAnalyzed: results.length });
  return results;
}

export function getApprovalRate(ruleId: string): number | null {
  const stats = feedbackRepo.getStats(ruleId);
  if (!stats || stats.totalTriggered < 3) return null; // Not enough data
  return stats.approvalRate;
}

export async function generateRuleSuggestions(): Promise<RuleSuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  // Gather context
  const campaigns = campaignRepo.findAll();
  const existingRules = ruleRepo.findAll();
  const feedbackStats = feedbackRepo.getAllStats();
  const offers = offerRepo.findAll();
  const recentRecs = recommendationRepo.findRecent(30);

  // Get latest metrics for all campaigns
  const campaignMetrics = campaigns.map(c => {
    const m = metricsRepo.getLatest(c.id);
    return {
      id: c.id, name: c.name, status: c.status,
      offerId: c.offerId, dailyBudget: c.dailyBudget,
      metrics: m ? {
        spend: m.spend, leads: m.leads,
        cpl: m.cpl < 99999 ? m.cpl : null,
        cpc: m.cpc, ctr: m.ctr,
        registrationRate: m.registrationRate,
      } : null,
    };
  });

  const prompt = `You are an expert media buyer analyzing an ad operations system. Based on the data below, suggest 1-3 NEW rules that would improve campaign performance.

## Current Rules
${existingRules.map(r => `- ${r.name} (${r.tier}): IF ${JSON.stringify(r.conditions)} THEN ${r.action} ${JSON.stringify(r.actionParams)}`).join('\n')}

## Rule Performance (Approval Rates)
${feedbackStats.length > 0
    ? feedbackStats.map(s => `- ${s.ruleId}: ${s.totalTriggered} triggered, ${(s.approvalRate * 100).toFixed(0)}% approved`).join('\n')
    : 'No feedback data yet'}

## Offers
${offers.map(o => `- ${o.name} (${o.niche})`).join('\n') || 'None'}

## Campaign Performance
${campaignMetrics.map(c => c.metrics
    ? `- ${c.name}: CPL=$${c.metrics.cpl || 'N/A'}, CTR=${(c.metrics.ctr * 100).toFixed(2)}%, Leads=${c.metrics.leads}, Budget=$${c.dailyBudget}`
    : `- ${c.name}: No metrics`
  ).join('\n')}

## Recent Decisions
${recentRecs.slice(0, 10).map((r: any) => `- ${r.action} on ${r.entity_id || r.entityId}: ${r.status} (confidence: ${(r.confidence * 100).toFixed(0)}%)`).join('\n') || 'None'}

## Guidelines
- Don't suggest rules that duplicate existing ones
- Focus on gaps: metrics or patterns not covered by current rules
- Consider the offer niche when setting thresholds
- Rules with low approval rates might need adjustment — suggest replacements
- Prioritize rules that protect against waste (high spend, low returns)

Respond in JSON array format:
[
  {
    "name": "Rule Name",
    "description": "What this rule does and why",
    "tier": "universal" or "offer",
    "offerId": null or "offer-id",
    "conditions": [{"metric": "cpl", "operator": "gt", "threshold": 50}],
    "action": "pause_campaign" | "decrease_budget" | "increase_budget" | "start_campaign",
    "actionParams": {} or {"percentage": 20},
    "priority": 10,
    "cooldownMinutes": 60,
    "reasoning": "Why this rule should exist based on the data"
  }
]`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('No JSON array in rule suggestion response');
      return [];
    }

    const suggestions: any[] = JSON.parse(jsonMatch[0]);
    const now = new Date().toISOString();

    const saved: RuleSuggestion[] = suggestions.map(s => {
      const suggestion: RuleSuggestion = {
        id: `suggestion-${randomUUID().slice(0, 8)}`,
        name: s.name,
        description: s.description,
        tier: s.tier || 'universal',
        offerId: s.offerId || null,
        conditions: s.conditions,
        action: s.action,
        actionParams: s.actionParams || {},
        priority: s.priority || 10,
        cooldownMinutes: s.cooldownMinutes || 60,
        reasoning: s.reasoning,
        status: 'pending',
        suggestedAt: now,
        resolvedAt: null,
        resolvedBy: null,
      };
      feedbackRepo.insertSuggestion(suggestion);
      return suggestion;
    });

    logger.info('Generated rule suggestions', { count: saved.length });
    return saved;
  } catch (err) {
    logger.error('Failed to generate rule suggestions', { error: String(err) });
    return [];
  }
}
