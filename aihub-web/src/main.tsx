import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Login from './Login';
import Chat from './Chat';
import { deleteConversation, listConversations, renameConversation, type Conversation } from './api';
import './styles.css';

function DashboardLayout({ onLogout }: { onLogout: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

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
    <a>◈ Models</a><a>⚙ Settings</a>
  </nav><div className="user"><div className="avatar">A</div><div><b>AIHub User</b><small>Tenant {localStorage.getItem('aihub_tenant_id') || '1'}</small></div><button className="logout" onClick={onLogout}>×</button></div></aside><main><Outlet /></main></div>;
}

function DashboardHome() { const navigate = useNavigate(); return <><header><div><p className="eyebrow">AI PLATFORM</p><h1>Welcome to AIHub</h1><p className="muted">One place to manage models, conversations and AI providers.</p></div><button onClick={()=>navigate('/chat')}>＋ New Chat</button></header><section className="grid"><article><small>ACTIVE MODELS</small><strong>1</strong><p>OpenAI-compatible provider</p></article><article><small>CONVERSATIONS</small><strong>—</strong><p>Choose a conversation from the sidebar</p></article><article><small>API STATUS</small><strong className="ok">● Online</strong><p>Backend services are ready</p></article></section><section className="hero"><div><p className="eyebrow">START HERE</p><h2>Talk to your AI</h2><p className="muted">Authentication, tenant context, conversation persistence and streaming are connected.</p><button className="primary" onClick={()=>navigate('/chat')}>Start a conversation →</button></div><div className="orb">✦</div></section></>; }

function ChatRoute() { const { id } = useParams(); const navigate = useNavigate(); return <Chat initialConversationId={id ? Number(id) : null} onBack={()=>navigate('/')} onConversationChange={(conversationId)=>navigate(`/chat/${conversationId}`, { replace: true })}/>; }

function ProtectedApp({ onLogout }: { onLogout: () => void }) { return <Routes><Route element={<DashboardLayout onLogout={onLogout}/>}><Route index element={<DashboardHome/>}/><Route path="chat" element={<ChatRoute/>}/><Route path="chat/:id" element={<ChatRoute/>}/></Route></Routes>; }

function App() { const [authenticated,setAuthenticated]=useState(Boolean(localStorage.getItem('aihub_token'))); function logout(){localStorage.removeItem('aihub_token');setAuthenticated(false);} if(!authenticated)return <Routes><Route path="*" element={<Login onLogin={()=>setAuthenticated(true)}/>}/></Routes>; return <ProtectedApp onLogout={logout}/>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
