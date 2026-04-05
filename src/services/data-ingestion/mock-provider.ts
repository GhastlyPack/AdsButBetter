import { DataProvider } from './index';
import { MetricsSnapshot } from '../../models';

export class MockDataProvider implements DataProvider {
  async fetchMetrics(entityId: string): Promise<MetricsSnapshot> {
    // TODO: Generate realistic mock metrics with trends and anomalies
    throw new Error('Not implemented');
  }

  async fetchAllMetrics(): Promise<MetricsSnapshot[]> {
    // TODO: Return metrics for all mock campaigns
    throw new Error('Not implemented');
  }
}
