export default function ReadmePage() {
  const s = { color: 'var(--text-secondary)', lineHeight: 2, fontSize: 14, paddingLeft: 20 };
  const h = { color: 'var(--text-primary)' };
  const a = { color: 'var(--accent)' };
  const g = { color: 'var(--green)' };
  const o = { color: 'var(--orange)' };
  const t = { color: 'var(--text-secondary)' };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>What is AdsButBetter?</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 14 }}>
          AdsButBetter is an AI-powered ad operations agent built for lead generation. It monitors Meta Ads campaigns in near real-time, evaluates performance against configurable rules, and uses Claude AI to generate intelligent recommendations — all managed through this dashboard and Discord.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>What's Built</h3>
        <ul style={s}>
          <li><strong style={h}>Meta Ads Integration</strong> — Pull live campaign data from your Meta ad account (toggle between mock data and live)</li>
          <li><strong style={h}>Rule Engine (L1/L2)</strong> — L1 universal rules run on all campaigns. L2 offer-specific rules only run on campaigns in that offer/niche</li>
          <li><strong style={h}>Offers System</strong> — Group campaigns by offer/vertical with different rule thresholds per niche</li>
          <li><strong style={h}>AI Reasoning (Claude)</strong> — Every recommendation includes AI-generated confidence scores and contextual reasoning based on metrics, trends, and history</li>
          <li><strong style={h}>AI Assistant</strong> — Chat with the AI on this dashboard or Discord (@mention or /ask). It can query data, create rules, and manage campaigns</li>
          <li><strong style={h}>AI Rule Suggestions</strong> — The AI analyzes patterns and suggests new rules. Approve to create, deny to dismiss</li>
          <li><strong style={h}>Feedback Loop</strong> — Your approve/deny decisions feed back into confidence scores. Rules with high approval rates boost future confidence</li>
          <li><strong style={h}>Discord Integration</strong> — 7 channels: #alerts (approve/deny), #ai-chat, #rule-suggestions, #warnings, #logs, #rules, #help</li>
          <li><strong style={h}>Warning System</strong> — Advisory alerts for issues like poor conversion rates that need human investigation, not automated action</li>
          <li><strong style={h}>Execution Engine</strong> — Approved actions change campaign budgets and statuses immediately</li>
          <li><strong style={h}>Auth0 SSO</strong> — Google sign-in restricted to @bowskyventures.com</li>
          <li><strong style={h}>Auto-Deploy</strong> — Push to GitHub main branch auto-deploys to EC2</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>How to Test (Mock Data)</h3>
        <ol style={s}>
          <li>Go to <strong style={h}>Settings</strong> — ensure data source is <strong style={a}>Mock Data</strong> and system is <strong style={a}>ON</strong></li>
          <li>Go to <strong style={h}>Campaigns</strong> — click <strong style={a}>Poll Metrics</strong> to generate data and evaluate rules</li>
          <li>Click a campaign row to see details — use <strong style={a}>Manual Entry</strong> to set specific metric values</li>
          <li>Use anomaly buttons (<strong style={{ color: 'var(--red)' }}>Spike CPL</strong>, <strong style={o}>Zero Leads</strong>) to force rules to trigger</li>
          <li>Check <strong style={h}>Actions</strong> page — approve or deny recommendations (also appears in Discord #alerts)</li>
          <li>Go to <strong style={h}>Rules</strong> — click <strong style={a}>AI Suggest Rules</strong> to get AI-generated rule suggestions</li>
          <li>Try the <strong style={h}>AI Assistant</strong> — ask "How are my campaigns performing?" or "Create a rule to pause if CPL > $50"</li>
          <li>In Discord, @mention the bot or use <strong style={a}>/ask</strong> for the same AI capabilities</li>
          <li>View <strong style={h}>History</strong> to see all decisions and their outcomes</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Going Live with Meta Ads</h3>
        <ol style={s}>
          <li>Go to <strong style={h}>Settings</strong> — enter your Meta access token and ad account ID</li>
          <li>Click <strong style={a}>Test Connection</strong> to verify campaigns are visible</li>
          <li>Click <strong style={{ color: 'var(--red)' }}>Clear All History</strong> in the danger zone to wipe test data</li>
          <li>Switch data source to <strong style={a}>Meta Ads</strong></li>
          <li>Set polling intervals (recommended: 15-30 min for live data)</li>
          <li>Turn the system <strong style={a}>ON</strong></li>
          <li>Review your rules — adjust thresholds for your actual offer CPL targets</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Dashboard Pages</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Page</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td><strong>Overview</strong></td><td>Summary stats, top campaigns, recent activity</td></tr>
            <tr><td><strong>Campaigns</strong></td><td>Campaign list with metrics, manual entry, anomaly testing</td></tr>
            <tr><td><strong>Offers</strong></td><td>Group campaigns by offer/niche, assign campaigns</td></tr>
            <tr><td><strong>Rules</strong></td><td>Create/edit/delete rules, AI suggestions, L1/L2 tiers</td></tr>
            <tr><td><strong>Actions</strong></td><td>Pending recommendations — approve or deny</td></tr>
            <tr><td><strong>History</strong></td><td>Full decision log with status filters</td></tr>
            <tr><td><strong>AI Assistant</strong></td><td>Chat with Claude about campaigns, metrics, rules</td></tr>
            <tr><td><strong>Settings</strong></td><td>System on/off, AI toggle, data source, scheduler, Meta config, clear history</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Discord Channels</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Channel</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><strong>#alerts</strong></td><td>Action recommendations with approve/deny buttons</td></tr>
            <tr><td><strong>#ai-chat</strong></td><td>@mention the bot or /ask for AI queries</td></tr>
            <tr><td><strong>#rule-suggestions</strong></td><td>AI-suggested rules with approve/deny</td></tr>
            <tr><td><strong>#warnings</strong></td><td>Performance advisories (no action needed)</td></tr>
            <tr><td><strong>#logs</strong></td><td>System activity and decision log</td></tr>
            <tr><td><strong>#rules</strong></td><td>Rule engine reference</td></tr>
            <tr><td><strong>#help</strong></td><td>Getting started guide</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Roadmap</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Phase</th><th>Feature</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Core engine + dashboard + Discord</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>Meta Ads API integration</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>Rule tiers (L1 universal / L2 offer-specific)</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>AI reasoning layer (Claude confidence + analysis)</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>AI Assistant (dashboard + Discord chat)</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>AI rule suggestions + feedback loop</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>Warning system (advisory alerts)</td><td><span style={g}>Done</span></td></tr>
            <tr><td>1</td><td>Auth0 SSO (Google, domain whitelist)</td><td><span style={g}>Done</span></td></tr>
            <tr><td>2</td><td>GHL integration (qualified leads + close data)</td><td><span style={o}>Planned</span></td></tr>
            <tr><td>2</td><td>Autonomous execution (high-confidence auto-approve)</td><td><span style={o}>Planned</span></td></tr>
            <tr><td>3</td><td>Ad copy generation</td><td><span style={t}>Future</span></td></tr>
            <tr><td>4</td><td>Creative generation</td><td><span style={t}>Future</span></td></tr>
            <tr><td>5</td><td>Video generation</td><td><span style={t}>Future</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Key Metrics</h3>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Metric</th><th>What it means</th><th>Good/Bad</th></tr></thead>
          <tbody>
            <tr><td><strong>CPL</strong></td><td>Cost Per Lead — spend / leads</td><td>Lower is better (varies by offer)</td></tr>
            <tr><td><strong>CPC</strong></td><td>Cost Per Click — spend / clicks</td><td>Lower is better</td></tr>
            <tr><td><strong>CTR</strong></td><td>Click-Through Rate — clicks / impressions</td><td>Higher is better (ad engagement)</td></tr>
            <tr><td><strong>Reg Rate</strong></td><td>Registration Rate — leads / clicks</td><td>Higher is better (landing page conversion)</td></tr>
            <tr><td><strong>CPQL</strong></td><td>Cost Per Qualified Lead — from GHL</td><td>Coming in Phase 2</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
