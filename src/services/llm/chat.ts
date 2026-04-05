import Anthropic from '@anthropic-ai/sdk';
import { campaignRepo } from '../../db/repositories/campaign.repo';
import { metricsRepo } from '../../db/repositories/metrics.repo';
import { ruleRepo } from '../../db/repositories/rule.repo';
import { recommendationRepo } from '../../db/repositories/recommendation.repo';
import { offerRepo } from '../../db/repositories/offer.repo';
import { logger } from '../../utils/logger';

const CHAT_SYSTEM_PROMPT = `You are the AdsButBetter AI assistant — an expert media buyer and ad operations analyst for a lead generation agency.

You have access to tools that let you query and manage the ad operations system. Use them to answer questions about campaigns, metrics, rules, and recommendations.

## Business Context
- We run lead generation campaigns (webinar registrations, form fills) for telehealth businesses
- Key metrics: CPL (Cost Per Lead), CPC, CTR, Registration Rate
- "Leads" = registrations/signups
- Different offers have different acceptable CPL ranges
- Rules are tiered: L1 (universal, all campaigns) and L2 (offer-specific)

## Guidelines
- Be concise and actionable — managers need quick answers
- Always reference specific numbers when discussing performance
- When suggesting changes, explain the reasoning
- For destructive actions (pause, budget decrease), always confirm with the user first
- Format responses for readability (use bullet points, bold for key numbers)`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_campaigns',
    description: 'Get all campaigns with their current status, budget, and offer assignment',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_campaign_metrics',
    description: 'Get the latest metrics for a specific campaign including CPL, CPC, CTR, leads, spend',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID (e.g. camp-001)' },
        historyCount: { type: 'number', description: 'Number of historical snapshots to include (default 5)' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'get_rules',
    description: 'Get all configured rules with their conditions, actions, and tier (L1 universal or L2 offer-specific)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_recommendations',
    description: 'Get recent recommendations/actions with their status (pending, approved, denied, executed, expired)',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status: all, pending, executed, denied' },
        limit: { type: 'number', description: 'Max number to return (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_offers',
    description: 'Get all offers with their assigned campaigns',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_overview',
    description: 'Get a high-level overview: total campaigns, total leads, avg CPL, pending actions',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'modify_rule',
    description: 'Create, update, or delete a rule. For create: provide all fields. For update: provide id and changed fields. For delete: provide id and set delete=true.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'delete'], description: 'What to do with the rule' },
        id: { type: 'string', description: 'Rule ID (required for update/delete)' },
        name: { type: 'string' },
        description: { type: 'string' },
        tier: { type: 'string', enum: ['universal', 'offer'] },
        offerId: { type: 'string' },
        conditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              operator: { type: 'string' },
              threshold: { type: 'number' },
            },
          },
        },
        ruleAction: { type: 'string', enum: ['pause_campaign', 'start_campaign', 'increase_budget', 'decrease_budget'] },
        actionParams: { type: 'object' },
        priority: { type: 'number' },
        cooldownMinutes: { type: 'number' },
        enabled: { type: 'boolean' },
      },
      required: ['action'],
    },
  },
  {
    name: 'change_campaign_budget',
    description: 'Change a campaign daily budget. Use this when the user asks to adjust budget.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID' },
        newBudget: { type: 'number', description: 'New daily budget in dollars' },
      },
      required: ['campaignId', 'newBudget'],
    },
  },
  {
    name: 'pause_campaign',
    description: 'Pause a campaign',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'start_campaign',
    description: 'Resume/start a paused campaign',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID' },
      },
      required: ['campaignId'],
    },
  },
];

function executeTool(name: string, input: any): string {
  try {
    switch (name) {
      case 'get_campaigns': {
        const campaigns = campaignRepo.findAll();
        return JSON.stringify(campaigns.map(c => ({
          id: c.id, name: c.name, status: c.status,
          dailyBudget: c.dailyBudget, offerId: c.offerId,
        })));
      }
      case 'get_campaign_metrics': {
        const latest = metricsRepo.getLatest(input.campaignId);
        const history = metricsRepo.getHistory(input.campaignId, input.historyCount || 5);
        return JSON.stringify({
          latest: latest ? {
            spend: latest.spend, impressions: latest.impressions,
            clicks: latest.clicks, leads: latest.leads,
            cpl: latest.cpl < 99999 ? latest.cpl : null,
            cpc: latest.cpc, ctr: latest.ctr,
            registrationRate: latest.registrationRate,
            timestamp: latest.timestamp,
          } : null,
          history: history.map(m => ({
            spend: m.spend, leads: m.leads,
            cpl: m.cpl < 99999 ? m.cpl : null,
            ctr: m.ctr, timestamp: m.timestamp,
          })),
        });
      }
      case 'get_rules': {
        const rules = ruleRepo.findAll();
        return JSON.stringify(rules.map(r => ({
          id: r.id, name: r.name, tier: r.tier, offerId: r.offerId,
          enabled: r.enabled, conditions: r.conditions,
          action: r.action, actionParams: r.actionParams,
          priority: r.priority, cooldownMinutes: r.cooldownMinutes,
        })));
      }
      case 'get_recommendations': {
        const limit = input.limit || 10;
        let recs;
        if (input.status === 'pending') {
          recs = recommendationRepo.findPending();
        } else {
          recs = recommendationRepo.findRecent(limit);
        }
        return JSON.stringify(recs.map((r: any) => ({
          id: r.id, entityId: r.entity_id || r.entityId,
          action: r.action, confidence: r.confidence,
          reasoning: r.reasoning, status: r.status,
          createdAt: r.created_at || r.createdAt,
          resolvedBy: r.resolved_by || r.resolvedBy,
        })));
      }
      case 'get_offers': {
        const offers = offerRepo.findAll();
        return JSON.stringify(offers.map(o => {
          const camps = campaignRepo.findByOffer(o.id);
          return { ...o, campaigns: camps.map(c => ({ id: c.id, name: c.name })) };
        }));
      }
      case 'get_overview': {
        const campaigns = campaignRepo.findAll();
        let totalSpend = 0, totalLeads = 0;
        for (const c of campaigns) {
          const m = metricsRepo.getLatest(c.id);
          if (m) { totalSpend += m.spend; totalLeads += m.leads; }
        }
        const pending = recommendationRepo.findPending().length;
        return JSON.stringify({
          totalCampaigns: campaigns.length,
          active: campaigns.filter(c => c.status === 'active').length,
          paused: campaigns.filter(c => c.status === 'paused').length,
          totalSpend, totalLeads,
          avgCpl: totalLeads > 0 ? Math.round(totalSpend / totalLeads * 100) / 100 : 0,
          pendingActions: pending,
        });
      }
      case 'modify_rule': {
        if (input.action === 'delete') {
          const { getDb } = require('../../db');
          getDb().prepare('DELETE FROM rules WHERE id = ?').run(input.id);
          return JSON.stringify({ deleted: input.id });
        }
        const now = new Date().toISOString();
        if (input.action === 'create') {
          const rule = {
            id: input.id || `rule-${Date.now()}`,
            name: input.name || 'New Rule',
            description: input.description || '',
            enabled: input.enabled !== false,
            tier: input.tier || 'universal',
            offerId: input.offerId || null,
            entityLevel: 'campaign' as const,
            conditions: input.conditions || [],
            action: input.ruleAction || 'pause_campaign',
            actionParams: input.actionParams || {},
            priority: input.priority || 10,
            cooldownMinutes: input.cooldownMinutes || 60,
            createdAt: now, updatedAt: now,
          };
          ruleRepo.upsert(rule);
          return JSON.stringify({ created: rule });
        }
        if (input.action === 'update') {
          const existing = ruleRepo.findAll().find(r => r.id === input.id);
          if (!existing) return JSON.stringify({ error: 'Rule not found' });
          const updated = { ...existing, ...input, updatedAt: now };
          if (input.ruleAction) updated.action = input.ruleAction;
          ruleRepo.upsert(updated);
          return JSON.stringify({ updated: updated.id });
        }
        return JSON.stringify({ error: 'Invalid action' });
      }
      case 'change_campaign_budget': {
        campaignRepo.updateBudget(input.campaignId, input.newBudget);
        return JSON.stringify({ updated: input.campaignId, newBudget: input.newBudget });
      }
      case 'pause_campaign': {
        campaignRepo.updateStatus(input.campaignId, 'paused');
        return JSON.stringify({ paused: input.campaignId });
      }
      case 'start_campaign': {
        campaignRepo.updateStatus(input.campaignId, 'active');
        return JSON.stringify({ started: input.campaignId });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

export async function chat(
  userMessage: string,
  conversationHistory: Anthropic.MessageParam[] = []
): Promise<{ response: string; history: Anthropic.MessageParam[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { response: 'AI chat is not configured. Add ANTHROPIC_API_KEY to your .env.', history: conversationHistory };
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let response: Anthropic.Message;
  let iterations = 0;
  const maxIterations = 5;

  // Tool use loop
  while (iterations < maxIterations) {
    iterations++;

    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: CHAT_SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Check if there are tool calls
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (toolUseBlocks.length === 0) {
      // No tool calls — return the text response
      const textBlock = response.content.find(b => b.type === 'text');
      const text = textBlock?.type === 'text' ? textBlock.text : 'No response generated.';

      messages.push({ role: 'assistant', content: response.content });
      logger.info('AI chat response', { iterations, messageLength: text.length });

      return { response: text, history: messages };
    }

    // Execute tool calls and continue
    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(block => {
      if (block.type !== 'tool_use') throw new Error('Expected tool_use block');
      const result = executeTool(block.name, block.input);
      logger.debug('Tool executed', { tool: block.name, resultLength: result.length });
      return {
        type: 'tool_result' as const,
        tool_use_id: block.id,
        content: result,
      };
    });

    messages.push({ role: 'user', content: toolResults });
  }

  return { response: 'I ran out of iterations processing your request. Please try a simpler question.', history: messages };
}
