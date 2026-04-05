import { useState } from 'react';
import CampaignsPage from './pages/Campaigns';
import RulesPage from './pages/Rules';
import RecommendationsPage from './pages/Recommendations';
import './App.css';

type Page = 'campaigns' | 'rules' | 'recommendations';

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'campaigns', label: 'Campaigns', icon: '📊' },
  { key: 'rules', label: 'Rules', icon: '⚙️' },
  { key: 'recommendations', label: 'Actions', icon: '⚡' },
];

export default function App() {
  const [page, setPage] = useState<Page>('campaigns');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="ABB" className="sidebar-logo" />
          <span className="sidebar-title">ABB</span>
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
      </aside>
      <div className="content">
        <header className="header">
          <h1>{NAV_ITEMS.find(n => n.key === page)?.label}</h1>
        </header>
        <main className="main">
          {page === 'campaigns' && <CampaignsPage />}
          {page === 'rules' && <RulesPage />}
          {page === 'recommendations' && <RecommendationsPage />}
        </main>
      </div>
    </div>
  );
}
