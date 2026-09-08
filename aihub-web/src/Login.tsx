import { FormEvent, useState } from 'react';
import { login } from './api';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setBusy(true); try { const result = await login(username, password); const token = result.accessToken || result.token; if (!token) throw new Error('登录成功但未返回 JWT'); localStorage.setItem('aihub_token', String(token)); if (!localStorage.getItem('aihub_tenant_id')) localStorage.setItem('aihub_tenant_id', '1'); onLogin(); } catch (err) { setError(err instanceof Error ? err.message : '登录失败'); } finally { setBusy(false); } }
  return <main className="login-page"><section className="login-card"><div className="brand">AI<span>Hub</span></div><p className="eyebrow">AI PLATFORM</p><h1>Welcome back</h1><p className="muted">登录 AIHub，进入你的 AI 工作空间。</p><form onSubmit={submit}><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></label>{error&&<div className="error">{error}</div>}<button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in →'}</button></form></section></main>;
}
