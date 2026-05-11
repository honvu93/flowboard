'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function FlowStudioPage() {
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: "Hi! I'm Flow Studio, your AI video creation assistant.\n\nTell me your story idea and I'll help you turn it into a video.\n\nExample: \"I want a 30-second video about a robot exploring a futuristic city at sunset, Pixar style, vertical.\"" }]);
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim(); if (!text || loading) return;
    setMessages(p => [...p, { id: crypto.randomUUID(), role: 'user', content: text }]); setInput(''); setLoading(true);
    try {
      const resp = await fetch('/api/flow-studio/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      const reader = resp.body?.getReader(); if (!reader) { setLoading(false); return; }
      const decoder = new TextDecoder(); let buffer = '', content = '';
      const aiMsg = { id: crypto.randomUUID(), role: 'assistant', content: '' };
      setMessages(p => [...p, aiMsg]);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'content_block_delta' && d.delta?.text) content += d.delta.text; } catch {} }
          aiMsg.content = content; setMessages(p => p.map(m => m.id === aiMsg.id ? { ...aiMsg } : m));
        }
      }
    } catch (e) { setMessages(p => [...p, { id: crypto.randomUUID(), role: 'assistant', content: 'Error: ' + e.message }]); }
    setLoading(false);
  }, [input, loading]);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 shrink-0"><h1 className="text-lg font-semibold text-gray-900">Flow Studio</h1><span className="text-xs text-gray-500">Chat-driven video creation</span></header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ' + (msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md')}>{msg.content || 'Thinking...'}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="h-16 flex items-center gap-2 px-4 border-t border-gray-200 shrink-0 bg-white">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Describe your video idea..." rows={1} disabled={loading} className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50" />
        <button onClick={send} disabled={!input.trim() || loading} className="shrink-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-30 hover:bg-purple-700">{loading ? '...' : '→'}</button>
      </div>
    </div>
  );
}
