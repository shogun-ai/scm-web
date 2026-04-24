import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const INITIAL_OPTIONS = ['Зээл', 'Итгэлцэл', 'Тооцоолуур', 'Холбоо барих'];

const createInitialMessage = () => ({
  role: 'ai',
  text: 'Сайн байна уу? Би Солонго Капитал ББСБ-ийн санхүүгийн зөвлөх чатбот байна. Та доорх сонголтуудаас нэгийг дарж эсвэл асуултаа шууд бичиж болно.',
  options: INITIAL_OPTIONS
});

const createSessionId = () => (
  window.crypto && typeof window.crypto.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : `scm_${Date.now()}_${Math.random().toString(16).slice(2)}`
);

const isLocal = window.location.hostname === 'localhost';
const API_BASE_URL = isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

const OPTION_COMMANDS = {
  Зээл: 'loan',
  Итгэлцэл: 'trust',
  Тооцоолуур: 'calculator',
  'Холбоо барих': 'contact',
  'Үндсэн цэс': 'menu',
  'Автомашины зээл': 'car_loan',
  'Хэрэглээний зээл': 'consumer_loan',
  'Кредит карт': 'credit_card',
  'Бизнесийн зээл': 'business_loan',
  'Үл хөдлөх барьцаалсан зээл': 'real_estate_loan',
  'Шугмын зээл': 'line_loan',
  'Зээлийн тооцоолуур': 'loan_calc',
  'Итгэлцлийн тооцоолуур': 'trust_calc',
  Иргэн: 'individual',
  Байгууллага: 'company',
  'Бүрдүүлэх баримт бичиг': 'documents',
  Тооцоолол: 'calculate',
  'Тооцоолол хийх': 'calculate',
  'Онлайн хүсэлт өгөх': 'online_request',
  Буцах: 'back',
  Үгүй: 'no'
};

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([createInitialMessage()]);
  const sessionIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  const ensureSessionId = (forceNew = false) => {
    let sid = forceNew ? null : localStorage.getItem('scm_chat_session');

    if (!sid) {
      sid = createSessionId();
      localStorage.setItem('scm_chat_session', sid);
    }

    sessionIdRef.current = sid;
    return sid;
  };

  useEffect(() => {
    ensureSessionId();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const resetChat = () => {
    ensureSessionId(true);
    setMessages([createInitialMessage()]);
    setInput('');
    setIsLoading(false);
  };

  const navigateToLoanRequest = () => {
    const path = '/loan-request';
    window.history.pushState({ view: 'loan_request', path }, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'loan_request', path } }));
    setIsOpen(false);
  };

  const sendMessage = async (textToSend = input, displayText = textToSend) => {
    const messageText = String(textToSend || '').trim();
    if (!messageText || isLoading) return;

    const userMsg = { role: 'user', text: String(displayText || messageText).trim() };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = nextMessages.slice(-20).map((message) => ({
        role: message.role === 'ai' ? 'assistant' : 'user',
        content: message.text
      }));

      const sid = ensureSessionId();
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
      const optionsMatch = aiReply.match(/\[OPTIONS:\s*(.*?)\]/i);
      const actionMatch = aiReply.match(/\[ACTION:\s*(.*?)\]/i);
      const cleanText = [optionsMatch?.[0], actionMatch?.[0]]
        .filter(Boolean)
        .reduce((text, token) => text.replace(token, ''), aiReply)
        .trim();
      const options = optionsMatch
        ? optionsMatch[1].split(',').map((option) => option.trim()).filter(Boolean)
        : [];

      setMessages((prev) => [...prev, { role: 'ai', text: cleanText, options }]);

      if (actionMatch?.[1]?.trim() === 'loan_request') {
        setTimeout(navigateToLoanRequest, 300);
      }
    } catch (error) {
      console.error('ChatBot error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Уучлаарай, чатбот түр саатлаа. Дахин оролдоно уу эсвэл холбоо барих товчийг ашиглаарай.',
          options: ['Холбоо барих', 'Үндсэн цэс']
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (option) => {
    const actions = {
      Залгах: () => { window.location.href = 'tel:75991919'; },
      'Имэйл илгээх': () => { window.location.href = 'mailto:info@scm.mn'; },
      'Газрын зураг': () => window.open('https://maps.google.com/?q=Misheel+City+M3+Tower', '_blank', 'noopener,noreferrer'),
      'Шинэ чат': () => resetChat(),
      'Онлайн хүсэлт өгөх': () => navigateToLoanRequest(),
      'Зээлийн хүсэлт нээх': () => navigateToLoanRequest()
    };

    if (actions[option]) {
      actions[option]();
      return;
    }

    sendMessage(OPTION_COMMANDS[option] || option, option);
  };

  return (
    <div className="fixed bottom-6 right-6 font-sans" style={{ zIndex: 10000 }}>
      {isOpen && (
        <div className="mb-4 flex h-[600px] w-[330px] flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl duration-300 animate-in fade-in slide-in-from-bottom-8 md:w-[400px]">
          <div className="bg-gradient-to-br from-[#003B5C] via-[#003B5C] to-[#00A651] p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                    <span className="text-xl">💼</span>
                  </div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">FinExpert</h3>
                  <p className="text-[10px] text-green-200">Онлайн байна</p>
                </div>
              </div>

              <button onClick={() => setIsOpen(false)} className="text-white/70 transition-colors hover:text-white">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => sendMessage('menu', 'Үндсэн цэс')}
                disabled={isLoading}
                className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/25 disabled:opacity-60"
              >
                Үндсэн цэс
              </button>
              <button
                onClick={resetChat}
                disabled={isLoading}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#003B5C] transition hover:bg-slate-100 disabled:opacity-60"
              >
                Шинэ чат
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 p-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex animate-in slide-in-from-bottom-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                  <div
                    className={`rounded-3xl p-4 text-[13px] leading-relaxed shadow-sm ${
                      message.role === 'user'
                        ? 'rounded-tr-none bg-[#003B5C] text-white'
                        : 'rounded-tl-none border border-gray-100 bg-white text-gray-700'
                    }`}
                  >
                    {message.text.split('\n').map((line, lineIndex) => (
                      <p
                        key={lineIndex}
                        className={`mb-1 ${line.includes(':') && message.role !== 'user' ? 'font-bold text-[#003B5C]' : ''}`}
                      >
                        {line.replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>

                  {message.role === 'ai' && message.options?.length > 0 && (
                    <div className="mt-3 ml-1 flex flex-wrap gap-2">
                      {message.options.map((option, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => handleOptionClick(option)}
                          className="rounded-xl border border-[#00A651] bg-white px-4 py-2 text-[11px] font-bold text-[#00A651] shadow-sm transition-all hover:bg-[#00A651] hover:text-white active:scale-95"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ml-2 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-1">
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
                className="p-2 text-[#003B5C] transition-transform hover:scale-110 disabled:opacity-30"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group rounded-full border-2 border-white/20 bg-gradient-to-tr from-[#003B5C] to-[#00A651] p-5 text-white shadow-[0_20px_50px_rgba(0,166,81,0.3)] transition-all hover:scale-110 active:scale-90"
      >
        {isOpen ? (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
            </svg>
            <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-red-500" />
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
