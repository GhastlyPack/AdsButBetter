import { useState } from 'react';
import OverviewPage from './pages/Overview';
import CampaignsPage from './pages/Campaigns';
import RulesPage from './pages/Rules';
import RecommendationsPage from './pages/Recommendations';
import HistoryPage from './pages/History';
import './App.css';

type Page = 'overview' | 'campaigns' | 'rules' | 'recommendations' | 'history';

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'campaigns', label: 'Campaigns', icon: '📊' },
  { key: 'rules', label: 'Rules', icon: '⚙️' },
  { key: 'recommendations', label: 'Actions', icon: '⚡' },
  { key: 'history', label: 'History', icon: '📋' },
];

export default function App() {
  const [page, setPage] = useState<Page>('overview');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="ABB" className="sidebar-logo" />
          <span className="sidebar-title">AdsButBetter</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="https://app.adsbutbetter.com" className="text-secondary" style={{ fontSize: 11 }}>v0.1.0</a>
        </div>
      </aside>
      <div className="content">
        <header className="header">
          <h1>{NAV_ITEMS.find(n => n.key === page)?.label}</h1>
        </header>
        <main className="main">
          {page === 'overview' && <OverviewPage onNavigate={(p) => setPage(p as Page)} />}
          {page === 'campaigns' && <CampaignsPage />}
          {page === 'rules' && <RulesPage />}
          {page === 'recommendations' && <RecommendationsPage />}
          {page === 'history' && <HistoryPage />}
        </main>
      </div>
    </div>
  );
}
