import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Bot,
  Send,
  Minimize2,
  Maximize2,
  X,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import './Copilot.css';
import { stripEmojis } from '../../utils/text';

interface DataContext {
  totalLignes: number;
  txConformite: number;
  minutesArret: number;
}

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  dataContext?: DataContext | null;
  suggestedQuestions?: string[];
}

interface CopilotPanelProps {
  superviseurName: string;
  onClose: () => void;
}

const API_URL = 'http://localhost:3000/api';

const WELCOME_SUGGESTIONS = [
  "Quelle est la tendance de conformite aujourd'hui ?",
  'Quel est mon meilleur agent sur les 30 derniers jours ?',
  'Quelles lignes sont critiques aujourd\'hui ?',
];

const QUICK_QUESTIONS = [
  {
    label: 'Tendance',
    icon: TrendingUp,
    question: 'Quelle est la tendance de conformite sur les 7 derniers jours ?',
  },
  {
    label: 'Meilleur agent',
    icon: Award,
    question: 'Quel agent a la meilleure performance sur les 30 derniers jours ?',
  },
  {
    label: 'Critiques',
    icon: AlertTriangle,
    question: "Quelles sont les lignes critiques aujourd'hui ?",
  },
  {
    label: 'Recommandations',
    icon: Lightbulb,
    question: 'Quelles recommandations proposez-vous pour ameliorer la qualite ?',
  },
];

const CopilotPanel: React.FC<CopilotPanelProps> = ({ superviseurName, onClose }) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `Bonjour ${superviseurName}, Je suis votre Copilote Qualite IA. Posez-moi des questions sur vos lignes, vos agents ou la conformite. J'analyse vos donnees en temps reel pour vous repondre.`,
      suggestedQuestions: WELCOME_SUGGESTIONS,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!minimized) inputRef.current?.focus();
  }, [minimized]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const userMessage: CopilotMessage = { role: 'user', content: trimmed };
    const history = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/copilot/chat`,
        { messages: history },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const data = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: stripEmojis(data.answer) || 'Je n\'ai pas pu generer une reponse.',
          dataContext: data.dataContext || null,
          suggestedQuestions: (data.suggestedQuestions || []).map((q: string) => stripEmojis(q)),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err.response?.data?.message ||
            'Une erreur est survenue. Veuillez reessayer.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage(q);
  };

  return (
    <div className={`copilot-panel ${minimized ? 'copilot-minimized' : ''}`}>
      {/* HEADER */}
      <div className="copilot-header">
        <div className="copilot-header-left">
          <div className="copilot-avatar">
            <Bot size={20} />
          </div>
          <div className="copilot-header-info">
            <span className="copilot-title">Copilote Qualite IA</span>
            <span className="copilot-status">
              <span className="copilot-live-dot" />
              Donnees temps reel
            </span>
          </div>
        </div>
        <div className="copilot-header-actions">
          <button
            className="copilot-header-btn"
            title={minimized ? 'Agrandir' : 'Reduire'}
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button className="copilot-header-btn" title="Fermer" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* QUICK QUESTIONS */}
          <div className="copilot-quick">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q.label}
                className="copilot-quick-btn"
                onClick={() => handleQuickQuestion(q.question)}
                disabled={loading}
              >
                <q.icon size={13} />
                {q.label}
              </button>
            ))}
          </div>

          {/* MESSAGES */}
          <div className="copilot-messages">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`copilot-msg-row ${m.role === 'user' ? 'user' : 'assistant'}`}
              >
                {m.role === 'assistant' && (
                  <div className="copilot-bubble-wrap">
                    {m.dataContext && (
                      <div className="copilot-context-badges">
                        <span className="copilot-context-badge">
                          {m.dataContext.totalLignes} lignes aujourd'hui
                        </span>
                        <span className="copilot-context-badge">
                          {m.dataContext.txConformite}% conformite
                        </span>
                        <span className="copilot-context-badge">
                          {m.dataContext.minutesArret} min arret
                        </span>
                      </div>
                    )}
                    <div className="copilot-bubble">{m.content}</div>
                    {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                      <div className="copilot-suggestions">
                        {m.suggestedQuestions.map((q, qi) => (
                          <button
                            key={qi}
                            className="copilot-suggestion-btn"
                            onClick={() => handleQuickQuestion(q)}
                            disabled={loading}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {m.role === 'user' && (
                  <div className="copilot-bubble copilot-bubble-user">{m.content}</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="copilot-msg-row assistant">
                <div className="copilot-bubble-wrap">
                  <div className="copilot-bubble copilot-thinking">
                    Copilote reflechit
                    <span className="copilot-dots">
                      <span className="copilot-dot" />
                      <span className="copilot-dot" />
                      <span className="copilot-dot" />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="copilot-input-bar">
            <input
              ref={inputRef}
              type="text"
              className="copilot-input"
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage(input);
              }}
              disabled={loading}
            />
            <button
              className="copilot-send-btn"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CopilotPanel;
