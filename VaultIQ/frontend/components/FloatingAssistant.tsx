'use client';

import { useState } from 'react';
import AIAssistant from './AIAssistant';
import { Bot, X } from 'lucide-react';

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="floating-trigger glass" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Assistant"
      >
        <div className="orb-container">
          {isOpen ? <X size={28} className="icon-close" /> : <Bot size={28} className="icon-bot" />}
        </div>
      </button>

      {isOpen && (
        <div className="assistant-window animate-slide-up">
          <AIAssistant />
          <button className="close-btn" onClick={() => setIsOpen(false)} aria-label="Close Assistant">
            <X size={20} />
          </button>
        </div>
      )}

      <style jsx>{`
        .floating-trigger {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: linear-gradient(135deg, rgba(88, 166, 255, 0.2), rgba(15, 20, 30, 0.9));
          box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.2);
          z-index: 1000;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
          backdrop-filter: blur(15px);
        }

        .floating-trigger:hover {
          transform: scale(1.1) translateY(-4px);
          box-shadow: 0 15px 30px rgba(88, 166, 255, 0.3), inset 0 2px 5px rgba(255,255,255,0.3);
        }
        
        .orb-container {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          animation: pulse 2.5s infinite;
        }

        .assistant-window {
          position: fixed;
          bottom: 110px;
          right: 32px;
          width: 400px;
          z-index: 1000;
        }

        .close-btn {
          position: absolute;
          top: -12px;
          right: -12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(15, 20, 30, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1001;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transition: all 0.2s;
        }
        
        .close-btn:hover {
          background: rgba(255, 77, 77, 0.8);
          color: white;
          transform: scale(1.1);
        }

        @keyframes pulse {
          0% { filter: drop-shadow(0 0 5px rgba(88, 166, 255, 0.4)); transform: scale(0.95); }
          50% { filter: drop-shadow(0 0 15px rgba(88, 166, 255, 0.8)); transform: scale(1.05); }
          100% { filter: drop-shadow(0 0 5px rgba(88, 166, 255, 0.4)); transform: scale(0.95); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: bottom right;
        }
      `}</style>
    </>
  );
}
