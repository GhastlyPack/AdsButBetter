import { MockDataProvider } from '../services/data-ingestion/mock-provider';

async function main() {
  const provider = new MockDataProvider();

  console.log('=== All Campaigns (normal) ===');
  const snapshots = await provider.fetchAllMetrics();
  for (const s of snapshots) {
    console.log(`${s.entityId} | spend: $${s.spend} | imp: ${s.impressions} | clicks: ${s.clicks} | leads: ${s.leads} | CPC: $${s.cpc} | CTR: ${(s.ctr * 100).toFixed(2)}% | CPL: $${s.cpl}`);
  }

  console.log('\n=== Injecting spike_cpl anomaly on camp-001 ===');
  provider.injectAnomaly('camp-001', 'spike_cpl', 2);

  const after = await provider.fetchAllMetrics();
  for (const s of after) {
    const flag = s.entityId === 'camp-001' ? ' *** ANOMALY ***' : '';
    console.log(`${s.entityId} | spend: $${s.spend} | leads: ${s.leads} | CPL: $${s.cpl}${flag}`);
  }
}

main().catch(console.error);
