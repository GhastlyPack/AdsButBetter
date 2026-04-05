import { MetricsSnapshot } from '../../models';

export interface DataProvider {
  fetchMetrics(entityId: string): Promise<MetricsSnapshot>;
  fetchAllMetrics(): Promise<MetricsSnapshot[]>;
}
