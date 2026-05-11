import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Message } from '../../types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { socket } from '../../lib/socket';

export default function ChatWidget({ isStandalone = false }: { isStandalone?: boolean }) {
  const { user: authUser, profile: authProfile } = useAuth();
  const [guestUser, setGuestUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine effective user
  const user = authUser || guestUser;
  const profile = authProfile || (guestUser ? { displayName: `Guest_${guestUser.uid.slice(-4)}` } : null);
  const apiKey = new URLSearchParams(window.location.search).get('token');

  const toggleChat = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (isStandalone) {
      window.parent.postMessage({ type: 'twg-toggle', isOpen: newState }, '*');
    }
  };

  useEffect(() => {
    if (isStandalone && !authUser) {
      let gId = sessionStorage.getItem('twg_guest_id');
      if (!gId) {
        gId = 'guest_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('twg_guest_id', gId);
      }
      setGuestUser({ uid: gId, email: `${gId}@guest.twg`, name: 'Guest' });
    }
  }, [isStandalone, authUser]);

  useEffect(() => {
    if (!user) return;

    socket.connect();
    socket.emit('join_room', user.uid);

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/user/messages?email=${user.email}`);
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    fetchMessages();

    socket.on('new_message', (data: { message: Message, convId: string }) => {
      if (data.convId === user.uid) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socket.on('error', (err: { message: string }) => {
      if (err.message === 'INVALID_API_KEY') {
        setMessages(prev => [...prev, {
          id: 'error',
          senderId: 'system',
          text: 'CRITICAL ERROR: INVALID_API_TOKEN. UNABLE TO ESTABLISH SECURE LINK.',
          createdAt: new Date()
        } as any]);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('error');
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText;
    setInputText('');

    socket.emit('send_message', {
      text,
      senderId: user.uid,
      senderName: profile?.displayName,
      userEmail: user.email,
      isAdmin: false,
      apiKey: apiKey
    });
  };

  if (!user && !isStandalone) return null;

  return (
    <div className={cn(
      isStandalone ? "h-full w-full flex flex-col items-end justify-end" : "fixed bottom-6 right-6 z-50 flex flex-col items-end",
      "font-sans"
    )}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={isStandalone ? { opacity: 0, y: 10 } : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-[#0B0C0E] border border-[#1A1C1E] rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden",
              isStandalone ? "w-full h-full" : "w-[380px] h-[580px] mb-4"
            )}
          >
            {/* Header */}
            <div className="p-5 bg-[#08090A] border-b border-[#1A1C1E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-[#00FFA3] rounded-sm flex items-center justify-center font-black italic text-black text-xl">
                    T
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00FFA3] border-2 border-[#08090A] rounded-full shadow-[0_0_8px_#00ffa3]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xs uppercase tracking-widest">TWG Support</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">Secure Link: Active</p>
                </div>
              </div>
              <button 
                onClick={toggleChat}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide bg-[linear-gradient(rgba(26,28,30,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(26,28,30,.02)_1px,transparent_1px)] bg-[size:40px_40px]">
              <div className="text-center py-2">
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold italic">Encrypted Session Established</p>
              </div>

              {messages.map((msg) => {
                const isMine = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={cn("flex flex-col gap-1.5", isMine ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2">
                      {!isMine && <span className="text-[9px] font-bold text-[#00FFA3] uppercase tracking-widest italic">Core Agent</span>}
                      <span className="text-[8px] text-slate-600 font-mono">
                        {msg.createdAt && format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    <div className={cn(
                      "max-w-[85%] px-4 py-3 text-sm border leading-relaxed shadow-sm",
                      isMine 
                        ? "bg-[#161B22] text-[#E0E0E0] border-[#222529] rounded-tl-xl rounded-bl-xl rounded-br-xl" 
                        : "bg-[#00FFA3] text-black border-[#00FFA3] rounded-tr-xl rounded-br-xl rounded-bl-xl font-medium"
                    )}>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-5 border-t border-[#1A1C1E] bg-[#08090A]">
              <div className="relative flex items-center bg-[#121417] border border-[#222529] rounded-sm px-4 py-2 group focus-within:border-[#00FFA3]/50 transition-colors">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="TRANSMIT MESSAGE..."
                  className="flex-1 bg-transparent text-white py-1 text-xs focus:outline-none placeholder:text-slate-700 placeholder:font-bold placeholder:tracking-widest"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="text-[#00FFA3] hover:text-[#00FFA3]/80 disabled:opacity-20 transition-all active:scale-90 p-1"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {(!isOpen || !isStandalone) && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleChat}
          className="w-14 h-14 bg-[#00FFA3] rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,255,163,0.5)] z-50 border-2 border-black"
        >
          {isOpen ? <X size={24} /> : <div className="font-black italic text-xl">T</div>}
        </motion.button>
      )}
    </div>
  );
}
