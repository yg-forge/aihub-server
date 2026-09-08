import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Login from './Login';
import Chat from './Chat';
import { clearAuth, deleteConversation, listConversations, listModels, renameConversation, type Conversation, type ModelInfo } from './api';
import './styles.css';

function DashboardLayout({ onLogout }: { onLogout: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const username = localStorage.getItem('aihub_username') || 'AIHub User';
  const tenantId = localStorage.getItem('aihub_tenant_id');
  const role = localStorage.getItem('aihub_role');

  async function refreshHistory() {
    try { setConversations(await listConversations()); } catch { setConversations([]); }
  }
  useEffect(() => { refreshHistory(); }, [location.pathname]);

  async function rename(c: Conversation) {
    const title = window.prompt('Rename conversation', c.title);
    if (title === null || !title.trim() || title.trim() === c.title) return;
    try { await renameConversation(c.id, title.trim()); await refreshHistory(); }
    catch (err) { window.alert(err instanceof Error ? err.message : 'Failed to rename conversation'); }
  }

  async function remove(c: Conversation) {
    if (!window.confirm(`Delete “${c.title || 'New conversation'}”? This cannot be undone.`)) return;
    try {
      await deleteConversation(c.id);
      await refreshHistory();
      if (location.pathname === `/chat/${c.id}`) navigate('/chat');
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Failed to delete conversation'); }
  }

  return <div className="app"><aside><div className="brand">AI<span>Hub</span></div><nav>
    <NavLink to="/" className={({isActive})=>isActive?'active':''}>⌂ Dashboard</NavLink>
    <NavLink to="/chat" className={({isActive})=>isActive?'active':''}>✦ AI Chat</NavLink>
    <div className="history-heading"><span>CONVERSATIONS</span><button onClick={()=>navigate('/chat')} title="New conversation">＋</button></div>
    <div className="history-list">{conversations.length===0?<small className="history-empty">No conversations yet</small>:conversations.slice(0,12).map(c=><div key={c.id} className="history-row"><NavLink to={`/chat/${c.id}`} className="history-item">{c.title || 'New conversation'}</NavLink><div className="history-actions"><button onClick={()=>rename(c)} title="Rename">✎</button><button onClick={()=>remove(c)} title="Delete">×</button></div></div>)}</div>
    <NavLink to="/models" className={({isActive})=>isActive?'active':''}>◈ Models</NavLink><NavLink to="/settings" className={({isActive})=>isActive?'active':''}>⚙ Settings</NavLink>
  </nav><div className="user"><div className="avatar">{username.slice(0,1).toUpperCase()}</div><div><b>{username}</b><small>{tenantId ? `Tenant ${tenantId}` : role || 'Authenticated'}</small></div><button className="logout" onClick={onLogout} title="Sign out">×</button></div></aside><main><Outlet /></main></div>;
}

function DashboardHome() {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listModels(), listConversations()]).then(([modelRows, conversationRows]) => {
      if (cancelled) return;
      setModels(modelRows);
      setConversations(conversationRows);
      setApiError(false);
    }).catch(() => { if (!cancelled) setApiError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return <><header><div><p className="eyebrow">AI PLATFORM</p><h1>Welcome to AIHub</h1><p className="muted">One place to manage models, conversations and AI providers.</p></div><button onClick={()=>navigate('/chat')}>＋ New Chat</button></header><section className="grid"><article><small>ACTIVE MODELS</small><strong>{loading ? '…' : models.length}</strong><p>{models.length ? `${models[0].provider || 'Configured'} provider` : 'No enabled models'}</p></article><article><small>CONVERSATIONS</small><strong>{loading ? '…' : conversations.length}</strong><p>{conversations.length ? 'Saved in your workspace' : 'Start your first conversation'}</p></article><article><small>API STATUS</small><strong className={apiError ? 'error-status' : 'ok'}>{loading ? '● Checking' : apiError ? '● Unavailable' : '● Online'}</strong><p>{apiError ? 'Check authentication or backend service' : 'Backend services are ready'}</p></article></section><section className="hero"><div><p className="eyebrow">START HERE</p><h2>Talk to your AI</h2><p className="muted">Authentication, tenant context, conversation persistence and streaming are connected.</p><button className="primary" onClick={()=>navigate('/chat')}>Start a conversation →</button></div><div className="orb">✦</div></section></>;
}

function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { listModels().then(setModels).catch(err => setError(err instanceof Error ? err.message : 'Failed to load models')); }, []);
  return <section className="page-section"><header><div><p className="eyebrow">MODEL CATALOG</p><h1>Models</h1><p className="muted">Enabled models available to your workspace.</p></div></header>{error && <div className="error">{error}</div>}{!error && models.length === 0 && <div className="empty-card">No enabled models are available.</div>}<div className="model-list">{models.map(model => <article className="model-card" key={`${model.provider}:${model.model}`}><div><strong>{model.model}</strong><p className="muted">{model.provider || 'AI provider'}</p></div><span className="status-pill">Enabled</span></article>)}</div></section>;
}

function SettingsPage() { return <section className="page-section"><header><div><p className="eyebrow">WORKSPACE</p><h1>Settings</h1><p className="muted">Current authentication and workspace context.</p></div></header><div className="settings-card"><div><small>USERNAME</small><strong>{localStorage.getItem('aihub_username') || 'AIHub User'}</strong></div><div><small>ROLE</small><strong>{localStorage.getItem('aihub_role') || 'USER'}</strong></div><div><small>TENANT</small><strong>{localStorage.getItem('aihub_tenant_id') || 'Not provided by backend'}</strong></div></div></section>; }

function ChatRoute() { const { id } = useParams(); const navigate = useNavigate(); return <Chat initialConversationId={id ? Number(id) : null} onBack={()=>navigate('/')} onConversationChange={(conversationId)=>navigate(`/chat/${conversationId}`, { replace: true })}/>; }

function ProtectedApp({ onLogout }: { onLogout: () => void }) { return <Routes><Route element={<DashboardLayout onLogout={onLogout}/>}><Route index element={<DashboardHome/>}/><Route path="chat" element={<ChatRoute/>}/><Route path="chat/:id" element={<ChatRoute/>}/><Route path="models" element={<ModelsPage/>}/><Route path="settings" element={<SettingsPage/>}/></Route></Routes>; }

function App() { const [authenticated,setAuthenticated]=useState(Boolean(localStorage.getItem('aihub_token'))); function logout(){clearAuth();setAuthenticated(false);} if(!authenticated)return <Routes><Route path="*" element={<Login onLogin={()=>setAuthenticated(true)}/>}/></Routes>; return <ProtectedApp onLogout={logout}/>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
