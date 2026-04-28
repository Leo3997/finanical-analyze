import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  selectedSymbol: string;
  marketData: any;
}

export const AIAnalystChat = ({ 
  isOpen, 
  onClose,
  context 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  context?: ChatContext;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `您好！我是您的期货AI分析师。我可以为您提供：

- **行情分析**：结合当前市场形势解读品种走势
- **投资建议**：基于技术面和基本面的综合研判
- **风险提示**：识别潜在的市场风险和机会
- **策略制定**：为您量身定制交易策略

请告诉我您关注的品种或问题，我将为您提供专业分析。`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ai_chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          context: context
        })
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant') {
                    return [...prev.slice(0, -1), { ...lastMsg, content: assistantContent }];
                  }
                  return [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date()
                  }];
                });
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '抱歉，连接AI服务时出现错误。请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl h-[80vh] bg-[#0d0d0f] border border-[#262630] rounded-2xl overflow-hidden shadow-2xl shadow-[var(--gold)]/5 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e28] bg-gradient-to-r from-[#0d0d0f] to-[#131316]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#09090b]" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4ade80] rounded-full border-2 border-[#0d0d0f]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#e8e6e3]">AI 期货分析师</h3>
              <p className="text-[10px] font-data text-[#d4d0c8] tracking-wider uppercase">Futures AI Analyst · Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="px-3 py-1.5 rounded-lg text-xs text-[#d4d0c8] hover:text-[var(--gold)] hover:bg-[var(--gold)]/5 transition-all border border-transparent hover:border-[var(--gold)]/20"
            >
              清空对话
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/[0.03] text-[#d4d0c8] hover:text-[var(--gold)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#09090b]">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center mt-1">
                    <Sparkles className="w-4 h-4 text-[#09090b]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[var(--gold)]/15 border border-[var(--gold)]/25 text-[#e8e6e3]'
                    : 'bg-[#131316] border border-[#1e1e28] text-[#e8e6e3]'
                }`}>
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <p className="text-[9px] font-data text-[#c8c4bc] mt-2 text-right">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1a1a1f] border border-[#262630] flex items-center justify-center mt-1">
                    <User className="w-4 h-4 text-[#e0ddd5]" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center mt-1">
                <Loader2 className="w-4 h-4 text-[#09090b] animate-spin" />
              </div>
              <div className="bg-[#131316] border border-[#1e1e28] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#1e1e28] p-4 bg-[#0d0d0f]">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的问题，例如：分析豆粕后市走势..."
                className="w-full bg-[#131316] border border-[#262630] rounded-xl px-4 py-3 text-sm text-[#e8e6e3] placeholder-[#3a3a3a] focus:outline-none focus:border-[var(--gold)]/40 focus:ring-1 focus:ring-[var(--gold)]/20 resize-none min-h-[48px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] disabled:from-[#262630] disabled:to-[#262630] disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-[var(--gold)]/10 disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-[#09090b] animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-[#09090b]" />
              )}
            </button>
          </div>
          <p className="text-[9px] font-data text-[#c8c4bc] mt-2 text-center tracking-wider uppercase">
            AI 分析仅供参考，投资需谨慎
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};