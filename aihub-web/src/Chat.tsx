import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createConversation, getConversation, listModels, streamConversation, type ChatMessage, type ModelInfo, type StreamUsage } from './api';

type Props = { onBack: () => void; initialConversationId?: number | null; onConversationChange?: (id: number) => void };

type RenderBlock = { kind: 'text' | 'code'; value: string; language?: string };

function renderMarkdown(value: string): ReactNode[] {
  const blocks: RenderBlock[] = [];
  const regex = /```([\w-]*)\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value))) {
    if (match.index > cursor) blocks.push({ kind: 'text', value: value.slice(cursor, match.index) });
    blocks.push({ kind: 'code', value: match[2], language: match[1] || undefined });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length || blocks.length === 0) blocks.push({ kind: 'text', value: value.slice(cursor) });
  return blocks.map((block, index) => {
    if (block.kind === 'code') return <pre key={index} className="code-block"><code>{block.value}</code></pre>;
    return block.value.split(/\n\n+/).map((paragraph, paragraphIndex) => {
      const lines = paragraph.split('\n');
      return <p key={`${index}-${paragraphIndex}`}>{lines.map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < lines.length - 1 && <br />}</span>)}</p>;
    });
  });
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
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);
  const abortRef = useRef<AbortController | null>(null);

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

  useEffect(() => () => abortRef.current?.abort(), []);

  async function runGeneration(id: number, selectedModel: string, content: string, replaceAssistant = false) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true); setError(''); setUsage(null);
    if (!replaceAssistant) setMessages(prev => [...prev, { role: 'user', content }, { role: 'assistant', content: '' }]);
    else setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: '' }]);
    try {
      await streamConversation(id, selectedModel, content, delta => {
        setMessages(prev => {
          const next = [...prev];
          const last = next.length - 1;
          next[last] = { ...next[last], content: next[last].content + delta };
          return next;
        });
      }, setUsage, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || busy || !model) return;
    setInput('');
    try {
      let id = conversationId;
      if (!id) { const created = await createConversation(model, content.slice(0, 48)); id = created.id; setConversationId(id); onConversationChange?.(id); }
      await runGeneration(id, model, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create conversation');
      setBusy(false);
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setBusy(false);
  }

  async function retry() {
    if (busy || !conversationId || messages.length < 2) return;
    const lastUser = [...messages].reverse().find(message => message.role === 'user');
    if (!lastUser) return;
    await runGeneration(conversationId, model, lastUser.content, true);
  }

  async function copyMessage(index: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(index);
      window.setTimeout(() => setCopied(current => current === index ? null : current), 1200);
    } catch {
      setError('复制失败，请检查浏览器剪贴板权限');
    }
  }

  return <main className="chat-page"><header className="chat-header"><button onClick={onBack}>← Dashboard</button><div><p className="eyebrow">AI CHAT</p><h1>{conversationId ? 'Conversation' : 'New conversation'}</h1></div><label className="model-select">Model<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy||loading||modelsLoading||models.length===0}>{models.map(m=><option key={m.model} value={m.model}>{m.model}</option>)}</select></label></header><section className="chat-shell"><div className="messages">{loading&&<div className="empty-chat"><div className="orb small">✦</div><h2>Loading conversation…</h2></div>}{!loading&&messages.length===0&&<div className="empty-chat"><div className="orb small">✦</div><h2>How can I help?</h2><p className="muted">Ask anything. AIHub will stream the response in real time.</p></div>}{!loading&&messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-label">{m.role==='user'?'You':'AIHub'}</div><div className="message-body">{m.role==='assistant' ? renderMarkdown(m.content || (busy&&i===messages.length-1?'Thinking…':'')) : <p>{m.content}</p>}{m.role==='assistant' && m.content && <div className="message-actions"><button type="button" onClick={()=>copyMessage(i,m.content)}>{copied===i?'Copied':'Copy'}</button>{i===messages.length-1 && !busy && <button type="button" onClick={retry}>Retry</button>}</div>}</div></div>)}{busy&&<div className="stream-status">Generating response… <button type="button" onClick={stopGeneration}>Stop</button></div>}{usage&&<div className="usage">Tokens: {usage.totalTokens ?? ((usage.inputTokens || 0) + (usage.outputTokens || 0))}</div>}{models.length===0&&!modelsLoading&&!loading&&<div className="error">No enabled AI models are available.</div>}{error&&<div className="error">{error}</div>}</div><form className="composer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={modelsLoading?'Loading models…':'Message AIHub…'} rows={2} disabled={busy||loading||modelsLoading||!model} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button className="primary send" disabled={busy||loading||modelsLoading||!model||!input.trim()}>{busy?'Streaming…':'Send ↑'}</button></form></section></main>;
}
