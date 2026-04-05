import Anthropic from '@anthropic-ai/sdk';
import { RecommendationContext } from './context-builder';
import { RECOMMENDATION_ANALYSIS_PROMPT } from './prompts';
import { logger } from '../../utils/logger';

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface LLMAnalysis {
  confidence: number;
  reasoning: string;
}

export async function analyzeRecommendation(context: RecommendationContext): Promise<LLMAnalysis | null> {
  const anthropic = getClient();
  if (!anthropic) {
    logger.debug('LLM not configured (no ANTHROPIC_API_KEY)');
    return null;
  }

  const userMessage = `## Rule Triggered
**${context.rule.name}**: ${context.rule.description}
**Action**: ${context.rule.action}${context.rule.actionParams.percentage ? ` by ${context.rule.actionParams.percentage}%` : ''}

## Conditions Met
${context.rule.conditions.map(c => `- ${c.metric} ${c.operator} ${c.threshold} (actual: ${c.actualValue})`).join('\n')}

## Campaign
- **Name**: ${context.campaign.name}
- **Daily Budget**: $${context.campaign.dailyBudget}
- **Offer**: ${context.campaign.offerName || 'None'} ${context.campaign.offerNiche ? `(${context.campaign.offerNiche})` : ''}

## Current Metrics
- Spend: $${context.currentMetrics.spend}
- Impressions: ${context.currentMetrics.impressions}
- Clicks: ${context.currentMetrics.clicks}
- Leads: ${context.currentMetrics.leads}
- CPL: $${context.currentMetrics.cpl}
- CPC: $${context.currentMetrics.cpc}
- CTR: ${(context.currentMetrics.ctr * 100).toFixed(2)}%
- Registration Rate: ${(context.currentMetrics.registrationRate * 100).toFixed(2)}%

## Metrics History (last ${context.metricsHistory.length} snapshots, newest first)
${context.metricsHistory.length > 0
    ? context.metricsHistory.map(m => `- CPL: $${m.cpl} | Leads: ${m.leads} | Spend: $${m.spend} | CTR: ${(m.ctr * 100).toFixed(2)}%`).join('\n')
    : 'No history available'}

## Recent Decisions for This Campaign
${context.historicalDecisions.length > 0
    ? context.historicalDecisions.map(d => `- ${d.action} → ${d.status} (confidence: ${(d.confidence * 100).toFixed(0)}%)`).join('\n')
    : 'No prior decisions'}

Analyze this situation and provide your confidence score and reasoning.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: RECOMMENDATION_ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*"confidence"[\s\S]*"reasoning"[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('LLM response did not contain valid JSON', { text: text.substring(0, 200) });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence)));
    const reasoning = String(parsed.reasoning).trim();

    logger.info('LLM analysis complete', {
      campaign: context.campaign.id,
      rule: context.rule.name,
      confidence,
    });

    return { confidence, reasoning };
  } catch (err) {
    logger.error('LLM analysis failed', { error: String(err) });
    return null;
  }
}
