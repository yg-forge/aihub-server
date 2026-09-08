import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createConversation, getConversation, listModels, streamConversation, type ChatMessage, type ModelInfo } from './api';

type Props = { onBack: () => void; initialConversationId?: number | null; onConversationChange?: (id: number) => void };

function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let code: string[] = [];
  let inCode = false;
  let key = 0;

  const flushCode = () => {
    if (!inCode) return;
    blocks.push(<pre className="code-block" key={`code-${key++}`}><code>{code.join('\n')}</code></pre>);
    code = [];
    inCode = false;
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) flushCode();
      else inCode = true;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      blocks.push(<div className="markdown-spacer" key={`space-${key++}`} />);
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      const text = line.replace(/^#{1,3}\s/, '');
      blocks.push(<p className="markdown-heading" key={`heading-${key++}`}>{text}</p>);
      continue;
    }
    blocks.push(<p key={`p-${key++}`}>{line}</p>);
  }
  flushCode();
  return blocks;
}

export default function Chat({ onBack, initialConversationId = null, onConversationChange }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialConversationId));
  const [modelsLoading, setModelsLoading] = useState(true);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    setModelsLoading(true);
    listModels().then(available => {
      setModels(available);
      setModel(current => current && available.some(m => m.model === current) ? current : (available[0]?.model || ''));
    }).catch(err => setError(err instanceof Error ? err.message : 'Failed to load models')).finally(() => setModelsLoading(false));
  }, []);

  useEffect(() => {
    if (!initialConversationId) { setMessages([]); setConversationId(null); setLoading(false); return; }
    setLoading(true); setError('');
    getConversation(initialConversationId).then(({ conversation, messages: loaded }) => {
      setConversationId(conversation.id); setModel(conversation.model); setMessages(loaded);
    }).catch(err => setError(err instanceof Error ? err.message : 'Failed to load conversation')).finally(() => setLoading(false));
  }, [initialConversationId]);

  async function sendMessage(content: string, retry = false) {
    if (!content || busy || !model) return;
    setError('');
    setBusy(true);
    if (!retry) setInput('');
    setMessages(prev => [...prev, { role: 'user' as const, content }, { role: 'assistant' as const, content: '' }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let id = conversationId;
      if (!id) { const created = await createConversation(model, content.slice(0, 48)); id = created.id; setConversationId(id); onConversationChange?.(id); }
      await streamConversation(id, model, content, delta => {
        setMessages(prev => {
          const next = [...prev];
          const last = next.length - 1;
          if (last < 0 || next[last].role !== 'assistant') return prev;
          next[last] = { ...next[last], content: next[last].content + delta };
          return next;
        });
      }, controller.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation stopped.');
      } else {
        setError(err instanceof Error ? err.message : 'Chat failed');
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    await sendMessage(content);
  }

  function retryLast() {
    if (busy) return;
    const lastUser = [...messages].reverse().find(message => message.role === 'user');
    if (lastUser) void sendMessage(lastUser.content, true);
  }

  function stop() {
    abortRef.current?.abort();
  }

  return <main className="chat-page"><header className="chat-header"><button onClick={onBack}>← Dashboard</button><div><p className="eyebrow">AI CHAT</p><h1>{conversationId ? 'Conversation' : 'New conversation'}</h1></div><label className="model-select">Model<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy||loading||modelsLoading||models.length===0}>{models.map(m=><option key={m.model} value={m.model}>{m.model}</option>)}</select></label></header><section className="chat-shell"><div className="messages">{loading&&<div className="empty-chat"><div className="orb small">✦</div><h2>Loading conversation…</h2></div>}{!loading&&messages.length===0&&<div className="empty-chat"><div className="orb small">✦</div><h2>How can I help?</h2><p className="muted">Ask anything. AIHub will stream the response in real time.</p></div>}{!loading&&messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-label">{m.role==='user'?'You':'AIHub'}</div><div className="message-body">{m.role === 'assistant' ? renderMarkdown(m.content || (busy&&i===messages.length-1?'Thinking…':'')) : m.content}</div>{m.role==='assistant' && i===messages.length-1 && !busy && m.content && <button className="message-action" type="button" onClick={retryLast}>Retry</button>}</div>)}{models.length===0&&!modelsLoading&&!loading&&<div className="error">No enabled AI models are available.</div>}{error&&<div className="error">{error}</div>}</div><form className="composer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={modelsLoading?'Loading models…':'Message AIHub…'} rows={2} disabled={busy||loading||modelsLoading||!model} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type={busy?'button':'submit'} className="primary send" onClick={busy?stop:undefined} disabled={loading||modelsLoading||!model||(!busy&&!input.trim())}>{busy?'Stop':'Send ↑'}</button></form></section></main>;
}
