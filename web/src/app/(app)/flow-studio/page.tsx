'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'plan' | 'progress' | 'media';
  plan?: { name: string; story: string; style?: string; orientation: string; characters: Array<{ name: string; entity_type: string; description: string }>; scenes: Array<{ prompt: string; character_names: string[] }> };
  progress?: { step: string; completed: number; total: number; items: Array<{ name: string; done: boolean }> };
}

export default function FlowStudioPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome', role: 'assistant', content: '',
      type: 'text',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatStarted = messages.length > 1;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim(); if (!text || loading) return;
    setMessages(p => [...p, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setInput(''); setLoading(true);
    try {
      const resp = await fetch('/api/flow-studio/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      const reader = resp.body?.getReader(); if (!reader) { setLoading(false); return; }
      const decoder = new TextDecoder(); let buffer = '', content = '';
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', type: 'text' };
      setMessages(p => [...p, aiMsg]);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { const d = JSON.parse(line.slice(6)); if (d.type === 'content_block_delta' && d.delta?.text) content += d.delta.text; } catch {}
          }
        }
        aiMsg.content = content;
        setMessages(p => p.map(m => m.id === aiMsg.id ? { ...aiMsg } : m));
      }
    } catch (e: any) { setMessages(p => [...p, { id: crypto.randomUUID(), role: 'assistant', content: 'Lỗi: ' + e.message }]); }
    setLoading(false);
  }, [input, loading]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-100 shrink-0 bg-white">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Flow Studio</h1>
          <p className="text-xs text-gray-400">Chat-driven video creation</p>
        </div>
        <button onClick={() => setMessages([{ id: 'welcome', role: 'assistant', content: '', type: 'text' }])} className="text-xs text-gray-400 hover:text-gray-600 transition">+ New chat</button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {!chatStarted ? (
          /* Welcome state */
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Bạn muốn tạo video gì?</h2>
            <p className="text-gray-500 text-center mb-8 max-w-md">
              Mô tả câu chuyện của bạn. AI sẽ trích xuất nhân vật, thiết kế cảnh và tạo video.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {[
                { icon: '🐱', title: 'Phim hoạt hình ngắn', prompt: 'Tôi muốn 1 video 30s về chú mèo bán cá ở chợ, phong cách Pixar 3D, 5 cảnh, dọc' },
                { icon: '🤖', title: 'Khám phá Sci-fi', prompt: 'Một robot nhỏ khám phá thành phố tương lai lúc hoàng hôn, anime style, ngang' },
                { icon: '🌧️', title: 'MV cảm xúc', prompt: 'MV buồn về chia tay trong mưa, phong cách điện ảnh, 8 cảnh, dọc' },
                { icon: '📚', title: 'Kể chuyện cổ tích', prompt: 'Kể chuyện Sơn Tinh Thủy Tinh, phong cách hoạt hình Việt Nam, 10 cảnh, ngang' },
              ].map((eg) => (
                <button key={eg.title} onClick={() => { setInput(eg.prompt); }} className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-left transition group">
                  <div className="text-2xl mb-2">{eg.icon}</div>
                  <div className="text-sm font-medium text-gray-800 group-hover:text-purple-700">{eg.title}</div>
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">{eg.prompt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 mr-3 mt-0.5">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-gray-50 text-gray-800 rounded-bl-md border border-gray-100'
                }`}>
                  {msg.content ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={chatStarted ? 'Tiếp tục mô tả hoặc yêu cầu chỉnh sửa...' : 'Mô tả ý tưởng video của bạn...'}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 bg-gray-50 focus:bg-white transition"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center disabled:opacity-30 hover:bg-purple-500 transition shadow-lg shadow-purple-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3 max-w-3xl mx-auto">
          AI có thể mắc lỗi. Hãy kiểm tra kế hoạch trước khi tạo video.
        </p>
      </div>
    </div>
  );
}
