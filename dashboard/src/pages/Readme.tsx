export default function ReadmePage() {
  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>What is AdsButBetter?</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 14 }}>
          AdsButBetter is an AI-powered ad operations agent that monitors Meta Ads campaign performance, evaluates metrics against defined rules, and recommends or executes optimizations — all with human approval via Discord or this dashboard.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>What Currently Works</h3>
        <ul style={{ color: 'var(--text-secondary)', lineHeight: 2, fontSize: 14, paddingLeft: 20 }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Mock Data Engine</strong> — Simulated campaigns with realistic lead gen metrics (CPL, CPC, CTR)</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Meta Ads Integration</strong> — Connect your real Meta ad account and pull live campaign data</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Rule Engine</strong> — JSON-based rules that evaluate metrics and trigger actions (pause, budget changes)</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Recommendation System</strong> — Generates recommendations with confidence scores when rules fire</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Discord Alerts</strong> — Recommendations sent to Discord with Approve/Deny buttons</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Execution Engine</strong> — Approved actions change campaign budgets and statuses</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Dashboard</strong> — Overview, campaigns, rules CRUD, actions, history, settings</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Scheduler</strong> — Automatic polling and evaluation on configurable intervals</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Ad Decline Detection</strong> — System-level alert when Meta rejects an ad</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>How to Test</h3>
        <ol style={{ color: 'var(--text-secondary)', lineHeight: 2, fontSize: 14, paddingLeft: 20 }}>
          <li>Go to <strong style={{ color: 'var(--text-primary)' }}>Settings</strong> and make sure data source is set to <strong style={{ color: 'var(--accent)' }}>Mock Data</strong></li>
          <li>Go to <strong style={{ color: 'var(--text-primary)' }}>Campaigns</strong> and click <strong style={{ color: 'var(--accent)' }}>Poll Metrics</strong> to generate data</li>
          <li>Click a campaign row to expand details — use <strong style={{ color: 'var(--accent)' }}>Manual Entry</strong> to set exact metric values</li>
          <li>Use anomaly buttons (<strong style={{ color: 'var(--red)' }}>Spike CPL</strong>, <strong style={{ color: 'var(--orange)' }}>Zero Leads</strong>) to trigger rules</li>
          <li>Check <strong style={{ color: 'var(--text-primary)' }}>Actions</strong> page to see recommendations — approve or deny them</li>
          <li>Check <strong style={{ color: 'var(--text-primary)' }}>Discord #alerts</strong> channel for the same recommendations</li>
          <li>View <strong style={{ color: 'var(--text-primary)' }}>History</strong> to see all past decisions</li>
          <li>Edit rules in <strong style={{ color: 'var(--text-primary)' }}>Rules</strong> page to customize thresholds</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Going Live with Meta Ads</h3>
        <ol style={{ color: 'var(--text-secondary)', lineHeight: 2, fontSize: 14, paddingLeft: 20 }}>
          <li>Go to <strong style={{ color: 'var(--text-primary)' }}>Settings</strong> and enter your Meta access token and ad account ID</li>
          <li>Click <strong style={{ color: 'var(--accent)' }}>Test Connection</strong> to verify</li>
          <li>Use <strong style={{ color: 'var(--accent)' }}>Clear History</strong> in Settings to wipe test data</li>
          <li>Switch data source to <strong style={{ color: 'var(--accent)' }}>Meta Ads</strong></li>
          <li>Turn the system ON and set your desired polling intervals</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Roadmap</h3>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Phase</th>
              <th>Feature</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>Core engine + dashboard + Discord</td><td><span style={{ color: 'var(--green)' }}>Done</span></td></tr>
            <tr><td>1</td><td>Meta Ads API integration</td><td><span style={{ color: 'var(--green)' }}>Done</span></td></tr>
            <tr><td>1.5</td><td>Rule tiers (L1 universal / L2 offer-specific)</td><td><span style={{ color: 'var(--orange)' }}>Planned</span></td></tr>
            <tr><td>1.5</td><td>GHL integration (qualified leads + close data)</td><td><span style={{ color: 'var(--orange)' }}>Planned</span></td></tr>
            <tr><td>2</td><td>LLM reasoning layer (AI explanations)</td><td><span style={{ color: 'var(--text-secondary)' }}>Future</span></td></tr>
            <tr><td>2</td><td>Ad copy generation</td><td><span style={{ color: 'var(--text-secondary)' }}>Future</span></td></tr>
            <tr><td>3</td><td>Creative generation</td><td><span style={{ color: 'var(--text-secondary)' }}>Future</span></td></tr>
            <tr><td>4</td><td>Video generation</td><td><span style={{ color: 'var(--text-secondary)' }}>Future</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Key Metrics</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Metric</th><th>What it means</th></tr></thead>
          <tbody>
            <tr><td><strong>CPL</strong></td><td>Cost Per Lead — spend / leads (registrations)</td></tr>
            <tr><td><strong>CPC</strong></td><td>Cost Per Click — spend / clicks</td></tr>
            <tr><td><strong>CTR</strong></td><td>Click-Through Rate — clicks / impressions</td></tr>
            <tr><td><strong>Reg Rate</strong></td><td>Registration Rate — leads / clicks (landing page conversion)</td></tr>
            <tr><td><strong>CPQL</strong></td><td>Cost Per Qualified Lead — from GHL (future)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
