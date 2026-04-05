import { Router } from 'express';
import { campaignRepo } from '../db/repositories/campaign.repo';
import { metricsRepo } from '../db/repositories/metrics.repo';
import { ruleRepo } from '../db/repositories/rule.repo';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { decisionLogRepo } from '../db/repositories/decision-log.repo';
import { MockDataProvider } from '../services/data-ingestion/mock-provider';
import { runEvaluation } from '../scheduler';

export function createApiRouter(dataProvider: MockDataProvider): Router {
  const router = Router();

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

  // Poll metrics + evaluate rules in one action
  router.post('/metrics/poll', async (_req, res) => {
    const snapshots = await dataProvider.fetchAllMetrics();
    for (const snapshot of snapshots) {
      metricsRepo.insert(snapshot);
    }
    const evalResult = runEvaluation();
    res.json({ polled: snapshots.length, ...evalResult });
  });

  // Rules
  router.get('/rules', (_req, res) => {
    const rules = ruleRepo.findAll();
    res.json(rules);
  });

  // Evaluate rules manually
  router.post('/rules/evaluate', (_req, res) => {
    const result = runEvaluation();
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

  router.post('/recommendations/:id/approve', (req, res) => {
    const rec = recommendationRepo.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    recommendationRepo.updateStatus(req.params.id, 'approved', 'dashboard');
    res.json({ status: 'approved' });
  });

  router.post('/recommendations/:id/deny', (req, res) => {
    const rec = recommendationRepo.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    recommendationRepo.updateStatus(req.params.id, 'denied', 'dashboard');
    res.json({ status: 'denied' });
  });

  // Decision logs
  router.get('/decisions', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = decisionLogRepo.findRecent(limit);
    res.json(logs);
  });

  // Anomaly injection (for testing)
  router.post('/test/anomaly', (req, res) => {
    const { campaignId, type, duration } = req.body;
    if (!campaignId || !type) {
      return res.status(400).json({ error: 'campaignId and type required' });
    }
    dataProvider.injectAnomaly(campaignId, type, duration || 3);
    res.json({ injected: { campaignId, type, duration: duration || 3 } });
  });

  return router;
}
