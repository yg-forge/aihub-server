import { FormEvent, useState } from 'react';
import { createConversation, streamConversation, type ChatMessage } from './api';

type Props = { onBack: () => void };

export default function Chat({ onBack }: Props) {
  const [model, setModel] = useState('gpt-4o-mini');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    setError(''); setInput(''); setBusy(true);
    const user = { role: 'user' as const, content };
    setMessages(prev => [...prev, user, { role: 'assistant' as const, content: '' }]);
    try {
      let id = conversationId;
      if (!id) { const created = await createConversation(model, content.slice(0, 48)); id = created.id; setConversationId(id); }
      await streamConversation(id, model, content, delta => {
        setMessages(prev => { const next = [...prev]; const last = next.length - 1; next[last] = { ...next[last], content: next[last].content + delta }; return next; });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      setError(message);
      setMessages(prev => prev.slice(0, -1));
    } finally { setBusy(false); }
  }

  return <main className="chat-page"><header className="chat-header"><button onClick={onBack}>← Dashboard</button><div><p className="eyebrow">AI CHAT</p><h1>New conversation</h1></div><label className="model-select">Model<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy}><option value="gpt-4o-mini">GPT-4o mini</option><option value="gpt-4o">GPT-4o</option></select></label></header><section className="chat-shell"><div className="messages">{messages.length===0&&<div className="empty-chat"><div className="orb small">✦</div><h2>How can I help?</h2><p className="muted">Ask anything. AIHub will stream the response in real time.</p></div>}{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-label">{m.role==='user'?'You':'AIHub'}</div><div className="message-body">{m.content || (busy&&i===messages.length-1?'Thinking…':'')}</div></div>)}{error&&<div className="error">{error}</div>}</div><form className="composer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Message AIHub…" rows={2} disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button className="primary send" disabled={busy||!input.trim()}>{busy?'Streaming…':'Send ↑'}</button></form></section></main>;
}
