import { useState, useRef, useEffect } from 'react';

const BASE = '/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, sessionId }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || data.error || 'No response',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to get response. Is the AI configured?',
        timestamp: new Date(),
      }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const clearChat = async () => {
    await fetch(`${BASE}/ai/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    setMessages([]);
  };

  const SUGGESTIONS = [
    'How are my campaigns performing?',
    'Which campaign has the highest CPL?',
    'Show me all active rules',
    'What actions are pending?',
    'Create a rule to pause campaigns with CPL over $50',
  ];

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <img src="/logo.png" alt="ABB" style={{ width: 48, height: 48, borderRadius: 10, marginBottom: 16 }} />
            <h3>AdsButBetter AI</h3>
            <p className="text-secondary">Ask me anything about your campaigns, metrics, rules, or performance. I can also make changes for you.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-bubble">
              {msg.role === 'assistant' ? (
                <div className="chat-markdown" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
            <div className="chat-time">{msg.timestamp.toLocaleTimeString()}</div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="chat-bubble chat-typing">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {messages.length > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={clearChat} style={{ marginRight: 8 }}>Clear</button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about your campaigns, metrics, or rules..."
          className="chat-input"
          disabled={loading}
          autoFocus
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br/>');
}
