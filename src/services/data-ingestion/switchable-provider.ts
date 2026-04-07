import { DataProvider } from './index';
import { MetricsSnapshot } from '../../models';
import { MockDataProvider } from './mock-provider';
import { MetaDataProvider } from './meta-provider';
import { runtimeSettings } from '../../config';
import { logger } from '../../utils/logger';

export class SwitchableDataProvider implements DataProvider {
  public mock: MockDataProvider;
  public meta: MetaDataProvider;

  constructor() {
    this.mock = new MockDataProvider();
    this.meta = new MetaDataProvider({
      accessToken: runtimeSettings.metaAccessToken,
      adAccountId: runtimeSettings.metaAdAccountId,
    });
  }

  private getActive(): DataProvider {
    return runtimeSettings.dataSource === 'meta' ? this.meta : this.mock;
  }

  async fetchMetrics(entityId: string): Promise<MetricsSnapshot> {
    logger.debug('Fetching metrics', { source: runtimeSettings.dataSource, entityId });
    return this.getActive().fetchMetrics(entityId);
  }

  async fetchAllMetrics(): Promise<MetricsSnapshot[]> {
    logger.debug('Fetching all metrics', { source: runtimeSettings.dataSource });
    return this.getActive().fetchAllMetrics();
  }

  async fetchAllAdSetMetrics(): Promise<MetricsSnapshot[]> {
    if (runtimeSettings.dataSource === 'meta') return [];
    return this.mock.fetchAllAdSetMetrics();
  }

  async fetchAllAdMetrics(): Promise<MetricsSnapshot[]> {
    if (runtimeSettings.dataSource === 'meta') return [];
    return this.mock.fetchAllAdMetrics();
  }

  setSource(source: 'mock' | 'meta'): void {
    runtimeSettings.dataSource = source;
    logger.info('Data source switched', { source });
  }

  getSource(): 'mock' | 'meta' {
    return runtimeSettings.dataSource;
  }

  updateMetaConfig(accessToken?: string, adAccountId?: string): void {
    if (accessToken) runtimeSettings.metaAccessToken = accessToken;
    if (adAccountId) runtimeSettings.metaAdAccountId = adAccountId;
    this.meta.updateConfig({ accessToken, adAccountId });
    logger.info('Meta config updated');
  }
}
