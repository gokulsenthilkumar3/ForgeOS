'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { apiFetch } from '../lib/api';

/**
 * VaultIQ AI Assistant (V2)
 * Advanced natural language interface with typing indicators and context awareness.
 */
export default function AIAssistant() {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! 👋 I am VaultIQ-Core. How can I help you manage your assets today?' }
  ]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMessage = query;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuery('');
    setIsTyping(true);

    try {
      const res = await apiFetch('/analytics/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      });
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.response || "I didn't receive a proper response from the core."
      }]);
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error communicating with VaultIQ-Core.'
      }]);
    }
  };

  return (
    <div className="ai-assistant glass-panel">
      <div className="chat-header glass">
        <div className="ai-brand">
          <div className="ai-avatar-header">
            <Bot size={24} className="bot-icon-header" />
          </div>
          <div className="header-text">
            <h3>VaultIQ Assistant</h3>
            <span className="ai-status">
              <Sparkles size={12} /> Neural Network Active
            </span>
          </div>
        </div>
      </div>
      
      <div className="chat-history">
        {messages.map((m, i) => (
          <div key={i} className={`message-row ${m.role} animate-slide-up`}>
            {m.role === 'assistant' && (
              <div className="avatar bot-avatar">
                <Bot size={16} />
              </div>
            )}
            <div className={`message-bubble ${m.role}`}>
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="avatar user-avatar">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="message-row assistant animate-slide-up">
            <div className="avatar bot-avatar">
              <Bot size={16} />
            </div>
            <div className="message-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <div className="chat-input glass">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask me anything..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="send-btn" onClick={handleSend} disabled={isTyping || !query.trim()} aria-label="Send message">
            <Send size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .ai-assistant {
          display: flex;
          flex-direction: column;
          height: 550px;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(15, 20, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
        }

        .chat-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(88, 166, 255, 0.05));
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }
        
        .chat-header::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
          opacity: 0.5;
        }

        .ai-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ai-avatar-header {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--accent-primary), #3b82f6);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px rgba(88, 166, 255, 0.4);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .header-text h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .ai-status {
          font-size: 0.75rem;
          color: var(--accent-success);
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .chat-history {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .chat-history::-webkit-scrollbar {
          width: 6px;
        }
        .chat-history::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        .message-row {
          display: flex;
          width: 100%;
          align-items: flex-end;
          gap: 10px;
        }

        .message-row.assistant { justify-content: flex-start; }
        .message-row.user { justify-content: flex-end; }

        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
        }

        .bot-avatar {
          background: var(--accent-primary);
          box-shadow: 0 2px 8px rgba(88, 166, 255, 0.3);
        }

        .user-avatar {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .message-bubble {
          max-width: 75%;
          padding: 14px 18px;
          border-radius: 18px;
          font-size: 0.95rem;
          line-height: 1.5;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .message-bubble.assistant {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.9);
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .message-bubble.user {
          background: linear-gradient(135deg, var(--accent-primary), #3b82f6);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 16px 20px;
          min-width: 60px;
        }

        .typing span {
          width: 6px;
          height: 6px;
          background: rgba(255,255,255,0.6);
          border-radius: 50%;
          animation: blink 1.4s infinite both;
        }

        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        .chat-input-wrapper {
          padding: 20px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .chat-input {
          display: flex;
          align-items: center;
          padding: 6px 6px 6px 20px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.04);
          transition: border-color 0.3s;
        }

        .chat-input:focus-within {
          border-color: rgba(88, 166, 255, 0.5);
          background: rgba(255,255,255,0.06);
        }

        .chat-input input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 10px 0;
          outline: none;
          font-size: 0.95rem;
        }
        
        .chat-input input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .send-btn {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-left: 8px;
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.05) rotate(-10deg);
          box-shadow: 0 4px 12px rgba(88, 166, 255, 0.4);
        }

        .send-btn:disabled {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
