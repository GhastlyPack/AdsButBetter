import { useState, useEffect } from 'react';
import LoginPage from './pages/Login';
import OverviewPage from './pages/Overview';
import CampaignsPage from './pages/Campaigns';
import OffersPage from './pages/Offers';
import RulesPage from './pages/Rules';
import RecommendationsPage from './pages/Recommendations';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import ChatPage from './pages/Chat';
import ReadmePage from './pages/Readme';
import './App.css';

type Page = 'overview' | 'campaigns' | 'offers' | 'rules' | 'recommendations' | 'history' | 'ai' | 'settings' | 'getting-started';

interface UserInfo {
  email: string;
  name: string;
  picture?: string;
}

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'getting-started', label: 'Getting Started', icon: '📖' },
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'campaigns', label: 'Campaigns', icon: '📊' },
  { key: 'offers', label: 'Offers', icon: '🏷️' },
  { key: 'rules', label: 'Rules', icon: '⚙️' },
  { key: 'recommendations', label: 'Actions', icon: '⚡' },
  { key: 'history', label: 'History', icon: '📋' },
  { key: 'ai', label: 'AI Assistant', icon: '🤖' },
  { key: 'settings', label: 'Settings', icon: '🔧' },
];

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'forbidden'>('loading');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [useAuth0, setUseAuth0] = useState(false);
  const [forbiddenMsg, setForbiddenMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/check')
      .then(async r => {
        const data = await r.json();
        if (r.ok && data.authenticated) {
          setAuthState('authenticated');
          setUser(data.user);
        } else if (r.status === 403) {
          setAuthState('forbidden');
          setForbiddenMsg(data.error || 'Access denied');
        } else {
          setAuthState('unauthenticated');
          // Check if Auth0 is configured by trying to detect redirect
          setUseAuth0(!data.authenticated && r.status === 401 && !document.cookie.includes('abb_auth'));
        }
      })
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  if (authState === 'loading') return null;

  if (authState === 'forbidden') {
    return (
      <div className="login-page">
        <div className="login-card">
          <img src="/logo.png" alt="ABB" className="login-logo" />
          <h1 className="login-title">Access Denied</h1>
          <p className="login-subtitle">{forbiddenMsg}</p>
          <a href="/logout" className="btn btn-secondary" style={{ display: 'inline-block', marginTop: 16 }}>Sign out</a>
        </div>
      </div>
    );
  }

  if (authState !== 'authenticated') {
    return <LoginPage onLogin={() => { setAuthState('authenticated'); setUser({ email: 'local', name: 'Local User' }); }} useAuth0={useAuth0} />;
  }

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
        {user && (
          <div className="sidebar-user">
            {user.picture && <img src={user.picture} alt="" className="user-avatar" />}
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
        )}
        <div className="sidebar-footer">
          {user?.email !== 'local' && <a href="/logout" className="text-secondary" style={{ fontSize: 11, marginRight: 12 }}>Sign out</a>}
          <span className="text-secondary" style={{ fontSize: 11 }}>v0.1.0</span>
        </div>
      </aside>
      <div className="content">
        <header className="header">
          <h1>{NAV_ITEMS.find(n => n.key === page)?.label}</h1>
        </header>
        <main className="main">
          {page === 'getting-started' && <ReadmePage />}
          {page === 'overview' && <OverviewPage onNavigate={(p) => setPage(p as Page)} />}
          {page === 'campaigns' && <CampaignsPage />}
          {page === 'offers' && <OffersPage />}
          {page === 'rules' && <RulesPage />}
          {page === 'recommendations' && <RecommendationsPage />}
          {page === 'history' && <HistoryPage />}
          {page === 'ai' && <ChatPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
