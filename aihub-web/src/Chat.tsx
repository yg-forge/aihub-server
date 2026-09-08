import { FormEvent, useEffect, useState } from 'react';
import { createConversation, getConversation, listConversations, streamConversation, type ChatMessage, type Conversation } from './api';

type Props = { onBack: () => void; initialConversationId?: number | null; onConversationChange?: (id: number) => void };

export default function Chat({ onBack, initialConversationId = null, onConversationChange }: Props) {
  const [model, setModel] = useState('gpt-4o-mini');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialConversationId));
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);

  useEffect(() => {
    if (!initialConversationId) { setMessages([]); setConversationId(null); setLoading(false); return; }
    setLoading(true); setError('');
    getConversation(initialConversationId).then(({ conversation, messages: loaded }) => {
      setConversationId(conversation.id); setModel(conversation.model); setMessages(loaded);
    }).catch(err => setError(err instanceof Error ? err.message : 'Failed to load conversation')).finally(() => setLoading(false));
  }, [initialConversationId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    setError(''); setInput(''); setBusy(true);
    const user = { role: 'user' as const, content };
    setMessages(prev => [...prev, user, { role: 'assistant' as const, content: '' }]);
    try {
      let id = conversationId;
      if (!id) { const created = await createConversation(model, content.slice(0, 48)); id = created.id; setConversationId(id); onConversationChange?.(id); }
      await streamConversation(id, model, content, delta => {
        setMessages(prev => { const next = [...prev]; const last = next.length - 1; next[last] = { ...next[last], content: next[last].content + delta }; return next; });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      setError(message); setMessages(prev => prev.slice(0, -1));
    } finally { setBusy(false); }
  }

  return <main className="chat-page"><header className="chat-header"><button onClick={onBack}>← Dashboard</button><div><p className="eyebrow">AI CHAT</p><h1>{conversationId ? 'Conversation' : 'New conversation'}</h1></div><label className="model-select">Model<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy||loading}><option value="gpt-4o-mini">GPT-4o mini</option><option value="gpt-4o">GPT-4o</option></select></label></header><section className="chat-shell"><div className="messages">{loading&&<div className="empty-chat"><div className="orb small">✦</div><h2>Loading conversation…</h2></div>}{!loading&&messages.length===0&&<div className="empty-chat"><div className="orb small">✦</div><h2>How can I help?</h2><p className="muted">Ask anything. AIHub will stream the response in real time.</p></div>}{!loading&&messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-label">{m.role==='user'?'You':'AIHub'}</div><div className="message-body">{m.content || (busy&&i===messages.length-1?'Thinking…':'')}</div></div>)}{error&&<div className="error">{error}</div>}</div><form className="composer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Message AIHub…" rows={2} disabled={busy||loading} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button className="primary send" disabled={busy||loading||!input.trim()}>{busy?'Streaming…':'Send ↑'}</button></form></section></main>;
}
