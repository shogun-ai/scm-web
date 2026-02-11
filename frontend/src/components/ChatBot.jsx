import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ SessionId: state machine-д чухал (component дотор байх ёстой)
  const sessionIdRef = useRef(null);

  useEffect(() => {
    let sid = localStorage.getItem('scm_chat_session');

    if (!sid) {
      // crypto.randomUUID() fallback
      sid =
        (window.crypto && typeof window.crypto.randomUUID === 'function')
          ? window.crypto.randomUUID()
          : `scm_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      localStorage.setItem('scm_chat_session', sid);
    }

    sessionIdRef.current = sid;
  }, []);

  // ✅ Анхны мэндчилгээ
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Сайн байна уу? Би Солонго Капитал ББСБ-ийн санхүүгийн ухаалаг зөвлөх байна. Танд юугаар туслах вэ?',
      options: ['Холбоо барих']
    }
  ]);

  const messagesEndRef = useRef(null);
  const isLocal = window.location.hostname === 'localhost';
  const API_BASE_URL = isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleOptionClick = (option) => {
    const actions = {
      'Залгах': () => (window.location.href = 'tel:75991919'),
      'Имэйл илгээх': () => (window.location.href = 'mailto:info@scm.mn'),
      'Газрын зураг': () => window.open('https://maps.google.com/?q=Misheel+City+M3+Tower', '_blank'),
      'Холбоо барих': () => sendMessage('Холбоо барих мэдээлэл өгнө үү', true)
    };

    if (actions[option]) actions[option]();
    else sendMessage(option, true);
  };

  const sendMessage = async (textToSend, isOption = false) => {
    const messageText = (textToSend ?? input).trim();
    if (!messageText || isLoading) return;

    const userMsg = { role: 'user', text: messageText };

    // ✅ setMessages асинк учраас яг одоо ашиглах "шинэ" түүхийг энд бэлдэнэ
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      // ✅ Backend рүү явуулах history (сүүлийн 20)
      const chatHistory = nextMessages.slice(-20).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text
      }));

      const sid = sessionIdRef.current || localStorage.getItem('scm_chat_session') || '';

      const res = await axios.post(
        `${API_BASE_URL}/api/chat`,
        {
          sessionId: sid,
          message: messageText,
          history: chatHistory
        },
        {
          headers: {
            'x-session-id': sid
          }
        }
      );

      const aiReply = res.data?.reply ?? '';
      let cleanText = aiReply;
      let options = [];

      const optionsMatch = aiReply.match(/\[OPTIONS:\s*(.*?)\]/i);
      if (optionsMatch) {
        cleanText = aiReply.replace(optionsMatch[0], '').trim();
        options = optionsMatch[1].split(',').map(o => o.trim()).filter(Boolean);
      }

      setMessages(prev => [...prev, { role: 'ai', text: cleanText, options }]);
    } catch (e) {
      console.error('AI Error:', e);
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: 'Уучлаарай, систем түр саатлаа. Та дахин оролдоно уу.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 font-sans" style={{ zIndex: 10000 }}>
      {isOpen && (
        <div className="bg-white shadow-2xl rounded-[2rem] w-[330px] md:w-[400px] h-[600px] flex flex-col mb-4 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="p-6 bg-gradient-to-br from-[#003B5C] via-[#003B5C] to-[#00A651] text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                    <span className="text-xl">👩‍💼</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">FinExpert</h3>
                  <p className="text-[10px] text-green-200">Онлайн байна</p>
                </div>
              </div>

              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                  <div className={`p-4 rounded-3xl text-[13px] leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-[#003B5C] text-white rounded-tr-none'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                  }`}>
                    {m.text.split('\n').map((line, idx) => (
                      <p
                        key={idx}
                        className={`${line.includes(':') ? 'font-bold text-[#003B5C] mb-1' : 'mb-1'} ${m.role === 'user' ? 'text-white' : ''}`}
                      >
                        {line.replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>

                  {m.role === 'ai' && m.options && m.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-1">
                      {m.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(opt)}
                          className="bg-white border border-[#00A651] text-[#00A651] px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-[#00A651] hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 ml-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2 items-center bg-gray-100 rounded-2xl px-4 py-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading}
                className="flex-1 bg-transparent py-3 text-sm outline-none disabled:opacity-50"
                placeholder="Асуултаа бичнэ үү..."
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading}
                className="text-[#003B5C] p-2 hover:scale-110 transition-transform disabled:opacity-30"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-tr from-[#003B5C] to-[#00A651] text-white p-5 rounded-full shadow-[0_20px_50px_rgba(0,166,81,0.3)] hover:scale-110 active:scale-90 transition-all border-2 border-white/20 group"
      >
        {isOpen ? (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        ) : (
          <div className="relative">
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"></path>
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
