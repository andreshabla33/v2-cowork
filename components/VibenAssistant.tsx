
import React, { useState, useRef, useEffect } from 'react';
import { generateChatResponse } from '../services/geminiService';
import { useStore } from '../store/useStore';
import { TaskStatus, Task } from '../types';

interface Message {
  role: 'user' | 'viben';
  text: string;
  timestamp: number;
}

interface VibenAssistantProps {
  onClose: () => void;
}

const STORAGE_KEY = 'viben_chat_history';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const VibenAssistant: React.FC<VibenAssistantProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tasks, currentUser, addTask } = useStore();
  const abortControllerRef = useRef<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        const validMessages = parsed.filter(m => now - m.timestamp < THIRTY_DAYS_MS);
        
        if (validMessages.length > 0) {
          setMessages(validMessages);
        } else {
          setMessages([{ 
            role: 'viben', 
            text: '¡Hola! Soy Viben. ¿En qué puedo ayudarte hoy?', 
            timestamp: now 
          }]);
        }
      } catch (error) {
        console.error("Error parsing chat history:", error);
      }
    } else {
      setMessages([{ 
        role: 'viben', 
        text: '¡Hola! Soy Viben. ¿En qué puedo ayudarte hoy?', 
        timestamp: now 
      }]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isMinimized]);

  const handleStopExecution = () => {
    abortControllerRef.current = true;
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    const now = Date.now();
    setInput('');
    abortControllerRef.current = false;
    
    const newUserMessage: Message = { role: 'user', text: userMsg, timestamp: now };
    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      const context = {
        tasks: tasks.map(t => `${t.title} (${t.status})`).join(', '),
        userName: currentUser.name,
        role: currentUser.role
      };
      
      const response = await generateChatResponse(userMsg, context);
      
      if (abortControllerRef.current) return;

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          if (fc.name === 'createTask') {
            const args = fc.args as any;
            const newTask: Task = {
              id: Math.random().toString(36).substr(2, 9),
              title: args.title || 'Nueva Tarea',
              description: args.description || '',
              startDate: args.startDate,
              dueDate: args.dueDate,
              status: TaskStatus.TODO,
              attachments: [],
            };
            addTask(newTask);
            
            const confirmationMsg: Message = {
              role: 'viben',
              text: `✅ He creado la tarea: "${newTask.title}".`,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, confirmationMsg]);
          }
        }
      } else {
        const textResponse = response.text || "Lo siento, no pude procesar tu solicitud.";
        const newVibenMessage: Message = { role: 'viben', text: textResponse, timestamp: Date.now() };
        setMessages(prev => [...prev, newVibenMessage]);
      }
    } catch (error) {
      if (abortControllerRef.current) return;
      const errorMessage: Message = { 
        role: 'viben', 
        text: 'Lo siento, tuve un problema. Intenta de nuevo.', 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex flex-col backdrop-blur-xl bg-black/60 border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(139,92,246,0.15)] overflow-hidden transition-all duration-300 ease-in-out w-full ${isMinimized ? 'h-[56px]' : 'h-[480px] max-h-[75vh]'}`}>
      {/* Header - Glassmorphism con gradiente estilo onboarding */}
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 p-3 flex items-center justify-between z-10 cursor-pointer group shrink-0"
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm border border-white/20">✨</div>
          <div>
            <h3 className="text-[11px] font-black leading-tight text-white uppercase tracking-wider">Viben Assistant</h3>
            <p className="text-[8px] text-white/70 uppercase font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
           <div className={`transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`}>
              <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
           </div>
           <button 
             onClick={(e) => { e.stopPropagation(); onClose(); }} 
             className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/40 scroll-smooth custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-lg shadow-violet-500/20' 
                    : 'backdrop-blur-xl bg-white/[0.05] text-zinc-200 rounded-bl-sm border border-white/[0.08]'
                }`}>
                  {m.text}
                  <div className={`text-[7px] mt-1.5 opacity-50 font-bold ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center gap-2">
                <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-[10px] text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <button 
                  onClick={handleStopExecution}
                  className="text-red-400 text-[8px] font-black uppercase tracking-widest hover:text-red-300 transition-colors"
                >
                  Detener
                </button>
              </div>
            )}
          </div>

          <div className="p-3 backdrop-blur-xl bg-black/40 border-t border-white/[0.05] shrink-0">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe aquí..."
                className="flex-1 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-zinc-600"
              />
              <button 
                onClick={handleSend} 
                disabled={isTyping} 
                className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:opacity-90 disabled:opacity-50 p-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/30 group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <svg className="w-4 h-4 text-white relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
