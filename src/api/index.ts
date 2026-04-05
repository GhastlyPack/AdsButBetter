import { Router } from 'express';
import { randomUUID } from 'crypto';
import { campaignRepo } from '../db/repositories/campaign.repo';
import { metricsRepo } from '../db/repositories/metrics.repo';
import { ruleRepo } from '../db/repositories/rule.repo';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { decisionLogRepo } from '../db/repositories/decision-log.repo';
import { getDb } from '../db';
import { SwitchableDataProvider } from '../services/data-ingestion/switchable-provider';
import { runEvaluation, restartScheduler } from '../scheduler';
import { runtimeSettings } from '../config';

let systemEnabled = true;

export function isSystemEnabled(): boolean {
  return systemEnabled;
}

export function createApiRouter(dataProvider: SwitchableDataProvider): Router {
  const router = Router();

  // System settings
  router.get('/settings', (_req, res) => {
    res.json({
      enabled: systemEnabled,
      metricsPollingIntervalMinutes: runtimeSettings.metricsPollingIntervalMinutes,
      ruleEvaluationIntervalMinutes: runtimeSettings.ruleEvaluationIntervalMinutes,
      dataSource: dataProvider.getSource(),
      metaAdAccountId: runtimeSettings.metaAdAccountId ? `***${runtimeSettings.metaAdAccountId.slice(-4)}` : '',
      metaConnected: !!(runtimeSettings.metaAccessToken && runtimeSettings.metaAdAccountId),
    });
  });

  router.post('/settings', (req, res) => {
    let schedulerChanged = false;

    if (typeof req.body.enabled === 'boolean') {
      systemEnabled = req.body.enabled;
    }
    if (typeof req.body.metricsPollingIntervalMinutes === 'number' && req.body.metricsPollingIntervalMinutes >= 1) {
      runtimeSettings.metricsPollingIntervalMinutes = req.body.metricsPollingIntervalMinutes;
      schedulerChanged = true;
    }
    if (typeof req.body.ruleEvaluationIntervalMinutes === 'number' && req.body.ruleEvaluationIntervalMinutes >= 1) {
      runtimeSettings.ruleEvaluationIntervalMinutes = req.body.ruleEvaluationIntervalMinutes;
      schedulerChanged = true;
    }
    if (req.body.dataSource === 'mock' || req.body.dataSource === 'meta') {
      dataProvider.setSource(req.body.dataSource);
    }
    if (req.body.metaAccessToken) {
      dataProvider.updateMetaConfig(req.body.metaAccessToken, req.body.metaAdAccountId);
    }
    if (req.body.metaAdAccountId && !req.body.metaAccessToken) {
      dataProvider.updateMetaConfig(undefined, req.body.metaAdAccountId);
    }

    if (schedulerChanged) {
      restartScheduler();
    }

    res.json({
      enabled: systemEnabled,
      metricsPollingIntervalMinutes: runtimeSettings.metricsPollingIntervalMinutes,
      ruleEvaluationIntervalMinutes: runtimeSettings.ruleEvaluationIntervalMinutes,
      dataSource: dataProvider.getSource(),
      metaAdAccountId: runtimeSettings.metaAdAccountId ? `***${runtimeSettings.metaAdAccountId.slice(-4)}` : '',
      metaConnected: !!(runtimeSettings.metaAccessToken && runtimeSettings.metaAdAccountId),
    });
  });

  // Test Meta connection
  router.post('/settings/test-meta', async (_req, res) => {
    try {
      const campaigns = await dataProvider.meta.fetchCampaigns();
      res.json({ success: true, campaigns: campaigns.length, data: campaigns });
    } catch (err) {
      res.json({ success: false, error: String(err) });
    }
  });

  // Overview stats
  router.get('/overview', (_req, res) => {
    const campaigns = campaignRepo.findAll();
    const active = campaigns.filter(c => c.status === 'active').length;
    const paused = campaigns.filter(c => c.status === 'paused').length;

    let totalSpend = 0;
    let totalLeads = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    const campaignStats: { id: string; name: string; status: string; budget: number; spend: number; leads: number; cpl: number; ctr: number }[] = [];

    for (const c of campaigns) {
      const latest = metricsRepo.getLatest(c.id);
      if (latest) {
        totalSpend += latest.spend;
        totalLeads += latest.leads;
        totalClicks += latest.clicks;
        totalImpressions += latest.impressions;
        campaignStats.push({
          id: c.id, name: c.name, status: c.status, budget: c.dailyBudget,
          spend: latest.spend, leads: latest.leads,
          cpl: latest.cpl < 99999 ? latest.cpl : 0,
          ctr: latest.ctr,
        });
      }
    }

    const avgCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads * 100) / 100 : 0;
    const pending = recommendationRepo.findPending().length;
    const recentActions = recommendationRepo.findRecent(5);

    res.json({
      campaigns: { total: campaigns.length, active, paused },
      metrics: { totalSpend: Math.round(totalSpend * 100) / 100, totalLeads, totalClicks, totalImpressions, avgCpl },
      pendingActions: pending,
      topCampaigns: campaignStats.sort((a, b) => b.leads - a.leads).slice(0, 5),
      recentActions,
    });
  });

  // Campaigns
  router.get('/campaigns', (_req, res) => {
    const campaigns = campaignRepo.findAll();
    res.json(campaigns);
  });

  router.get('/campaigns/:id', (req, res) => {
    const campaign = campaignRepo.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  });

  // Metrics
  router.get('/campaigns/:id/metrics', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 24;
    const history = metricsRepo.getHistory(req.params.id, limit);
    res.json(history);
  });

  router.get('/campaigns/:id/metrics/latest', (req, res) => {
    const latest = metricsRepo.getLatest(req.params.id);
    if (!latest) return res.status(404).json({ error: 'No metrics found' });
    res.json(latest);
  });

  // Manually insert a custom metrics snapshot + evaluate rules
  router.post('/metrics/manual', async (req, res) => {
    const { entityId, spend, impressions, clicks, leads } = req.body;
    if (!entityId) return res.status(400).json({ error: 'entityId required' });

    const s = spend ?? 0;
    const imp = impressions ?? 0;
    const cl = clicks ?? 0;
    const ld = leads ?? 0;

    const ctr = imp > 0 ? cl / imp : 0;
    const cpc = cl > 0 ? s / cl : 0;
    const cpl = ld > 0 ? s / ld : (s > 0 ? 99999 : 0);
    const registrationRate = cl > 0 ? ld / cl : 0;

    const snapshot = {
      id: randomUUID(),
      entityId,
      entityLevel: 'campaign' as const,
      timestamp: new Date().toISOString(),
      spend: Math.round(s * 100) / 100,
      impressions: Math.round(imp),
      clicks: Math.round(cl),
      leads: Math.round(ld),
      ctr: Math.round(ctr * 10000) / 10000,
      cpc: Math.round(cpc * 100) / 100,
      cpl: Math.round(cpl * 100) / 100,
      registrationRate: Math.round(registrationRate * 10000) / 10000,
      qualifiedLeads: null,
      cpql: null,
      revenue: null,
      roas: null,
    };

    metricsRepo.insert(snapshot);
    const evalResult = await runEvaluation();
    res.json({ snapshot, ...evalResult });
  });

  // Poll metrics + evaluate rules in one action
  router.post('/metrics/poll', async (_req, res) => {
    const snapshots = await dataProvider.fetchAllMetrics();
    for (const snapshot of snapshots) {
      metricsRepo.insert(snapshot);
    }
    const evalResult = await runEvaluation();
    res.json({ polled: snapshots.length, ...evalResult });
  });

  // Rules
  router.get('/rules', (_req, res) => {
    const rules = ruleRepo.findAll();
    res.json(rules);
  });

  router.post('/rules', (req, res) => {
    const { id, name, description, enabled, entityLevel, conditions, action, actionParams, priority, cooldownMinutes } = req.body;
    if (!id || !name || !action || !conditions) {
      return res.status(400).json({ error: 'id, name, action, and conditions are required' });
    }
    const now = new Date().toISOString();
    const rule = {
      id, name, description: description || '', enabled: enabled !== false,
      entityLevel: entityLevel || 'campaign', conditions, action,
      actionParams: actionParams || {}, priority: priority || 0,
      cooldownMinutes: cooldownMinutes || 60, createdAt: now, updatedAt: now,
    };
    ruleRepo.upsert(rule);
    res.json(rule);
  });

  router.put('/rules/:id', (req, res) => {
    const existing = ruleRepo.findAll().find(r => r.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Rule not found' });
    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    ruleRepo.upsert(updated);
    res.json(updated);
  });

  router.delete('/rules/:id', (req, res) => {
    getDb().prepare('DELETE FROM rules WHERE id = ?').run(req.params.id);
    res.json({ deleted: req.params.id });
  });

  // Evaluate rules manually
  router.post('/rules/evaluate', async (_req, res) => {
    const result = await runEvaluation();
    res.json(result);
  });

  // Recommendations
  router.get('/recommendations', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const recommendations = recommendationRepo.findRecent(limit);
    res.json(recommendations);
  });

  router.get('/recommendations/pending', (_req, res) => {
    const pending = recommendationRepo.findPending();
    res.json(pending);
  });

  router.post('/recommendations/:id/approve', async (req, res) => {
    try {
      const rec = recommendationRepo.findById(req.params.id);
      if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
      recommendationRepo.updateStatus(req.params.id, 'approved', 'dashboard');
      // Execute the action
      const { executeAction } = require('../services/execution');
      const result = await executeAction(rec);
      if (result.success) {
        recommendationRepo.updateStatus(req.params.id, 'executed', 'dashboard');
      }
      res.json({ status: 'executed', id: req.params.id, execution: result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/recommendations/:id/deny', (req, res) => {
    try {
      const rec = recommendationRepo.findById(req.params.id);
      if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
      recommendationRepo.updateStatus(req.params.id, 'denied', 'dashboard');
      res.json({ status: 'denied', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Decision logs
  router.get('/decisions', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = decisionLogRepo.findRecent(limit);
    res.json(logs);
  });

  // Simulate ad decline (for testing)
  router.post('/test/decline/:id', (req, res) => {
    campaignRepo.updateAdReviewStatus(req.params.id, 'declined');
    res.json({ declined: req.params.id });
  });

  router.post('/test/approve-ad/:id', (req, res) => {
    campaignRepo.updateAdReviewStatus(req.params.id, 'approved');
    res.json({ approved: req.params.id });
  });

  // Clear all history (for transitioning from test to production)
  router.post('/clear-history', (_req, res) => {
    getDb().prepare('DELETE FROM recommendations').run();
    getDb().prepare('DELETE FROM decision_logs').run();
    getDb().prepare('DELETE FROM metrics_snapshots').run();
    res.json({ cleared: true });
  });

  // Anomaly injection (for testing)
  router.post('/test/anomaly', (req, res) => {
    const { campaignId, type, duration } = req.body;
    if (!campaignId || !type) {
      return res.status(400).json({ error: 'campaignId and type required' });
    }
    dataProvider.mock.injectAnomaly(campaignId, type, duration || 3);
    res.json({ injected: { campaignId, type, duration: duration || 3 } });
  });

  return router;
}
