import { MockDataProvider } from '../services/data-ingestion/mock-provider';

async function main() {
  const provider = new MockDataProvider();

  console.log('=== All Campaigns (normal) ===');
  const snapshots = await provider.fetchAllMetrics();
  for (const s of snapshots) {
    console.log(`${s.entityId} | spend: $${s.spend} | imp: ${s.impressions} | clicks: ${s.clicks} | conv: ${s.conversions} | rev: $${s.revenue} | CPA: $${s.cpa} | ROAS: ${s.roas}`);
  }

  console.log('\n=== Injecting spike_cpa anomaly on camp-001 ===');
  provider.injectAnomaly('camp-001', 'spike_cpa', 2);

  const after = await provider.fetchAllMetrics();
  for (const s of after) {
    const flag = s.entityId === 'camp-001' ? ' *** ANOMALY ***' : '';
    console.log(`${s.entityId} | spend: $${s.spend} | CPA: $${s.cpa} | ROAS: ${s.roas}${flag}`);
  }

  console.log('\n=== Injecting zero_impressions on camp-003 ===');
  provider.injectAnomaly('camp-003', 'zero_impressions', 1);

  const after2 = await provider.fetchAllMetrics();
  for (const s of after2) {
    const flag = s.entityId === 'camp-003' ? ' *** ANOMALY ***' : '';
    console.log(`${s.entityId} | imp: ${s.impressions} | clicks: ${s.clicks} | spend: $${s.spend}${flag}`);
  }
}

main().catch(console.error);
