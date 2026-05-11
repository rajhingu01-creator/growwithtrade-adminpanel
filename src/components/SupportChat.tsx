import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

declare global {
  interface Window {
    __TWG_SUPPORT_SOCKET_URL__?: string;
  }
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  type?: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: string | Date;
}

interface ConversationUpdate {
  id: string;
  assignedTo?: string;
}

interface ChatProfile {
  name: string;
  email: string;
}

const ADMIN_DISPLAY_NAMES: Record<string, string> = {
  'dishahingu3007@gmail.com': 'Forixa',
  'rajhingu01@gmail.com': 'Purul',
  'tishakothiya61@gmail.com': 'Khusi',
  'bhavanahingu277@gmail.com': 'Mico',
};

export const SupportChat = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [profileName, setProfileName] = useState(user?.username || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [chatProfile, setChatProfile] = useState<ChatProfile | null>(null);
  const [assignedSupportName, setAssignedSupportName] = useState('Support Team');
  const socketRef = useRef<Socket | null>(null);
  const socketUrl = (
    window.__TWG_SUPPORT_SOCKET_URL__ ||
    (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin)
  ).trim();

  const guestIdentity = useMemo(() => {
    const saved = sessionStorage.getItem('twg_guest_id');
    if (saved) {
      return {
        uid: saved,
        email: `${saved}@guest.twg`,
        name: 'Guest User',
      };
    }

    const newGuestId = `guest_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('twg_guest_id', newGuestId);
    return {
      uid: newGuestId,
      email: `${newGuestId}@guest.twg`,
      name: 'Guest User',
    };
  }, []);

  const chatIdentity = useMemo(() => {
    if (!chatProfile) return null;

    const normalized = chatProfile.email.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fallbackUid = `guest_${normalized.slice(0, 16) || Date.now().toString()}`;

    return {
      uid: user?.id || fallbackUid || guestIdentity.uid,
      email: chatProfile.email,
      name: chatProfile.name,
    };
  }, [chatProfile, guestIdentity.uid, user?.id]);

  useEffect(() => {
    const savedProfile = sessionStorage.getItem('twg_chat_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as ChatProfile;
        if (parsed.name && parsed.email) {
          setChatProfile(parsed);
          setProfileName(parsed.name);
          setProfileEmail(parsed.email);
          return;
        }
      } catch {
        // Ignore invalid saved profile
      }
    }

    if (user?.username) setProfileName(user.username);
    if (user?.email) setProfileEmail(user.email);
  }, [user?.email, user?.username]);

  useEffect(() => {
    const socket: Socket = io(socketUrl, { autoConnect: false });
    socketRef.current = socket;

    const handleIncomingMessage = (data: { message: ChatMessage; convId: string }) => {
      if (data.convId === chatIdentity?.email) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleConversationUpdate = (conv: ConversationUpdate) => {
      if (conv.id !== chatIdentity?.email || !conv.assignedTo) return;
      const mappedName = ADMIN_DISPLAY_NAMES[conv.assignedTo];
      if (mappedName) {
        setAssignedSupportName(mappedName);
      }
    };

    if (!chatIdentity) return;

    socket.connect();
    socket.emit('join_room', chatIdentity.email);
    socket.on('new_message', handleIncomingMessage);
    socket.on('conversation_updated', handleConversationUpdate);

    return () => {
      socket.off('new_message', handleIncomingMessage);
      socket.off('conversation_updated', handleConversationUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatIdentity, socketUrl]);

  const handleSend = () => {
    const trimmed = message.trim();
    if ((!trimmed && !selectedImage) || !socketRef.current || !chatIdentity) return;

    const isImage = Boolean(selectedImage);

    socketRef.current.emit('send_message', {
      text: trimmed,
      senderId: chatIdentity.uid,
      senderName: chatIdentity.name,
      userEmail: chatIdentity.email,
      isAdmin: false,
      type: isImage ? 'image' : 'text',
      fileUrl: selectedImage || undefined,
      fileName: selectedImageName || undefined,
    });
    setMessage('');
    setSelectedImage(null);
    setSelectedImageName('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        setSelectedImage(dataUrl);
        setSelectedImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartChat = () => {
    const cleanName = profileName.trim();
    const cleanEmail = profileEmail.trim().toLowerCase();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!cleanName || !cleanEmail || !isEmailValid) return;

    const profile = { name: cleanName, email: cleanEmail };
    setChatProfile(profile);
    sessionStorage.setItem('twg_chat_profile', JSON.stringify(profile));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen && (
        <div className="mb-4 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.28)]">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold opacity-90">Chat with</p>
                <p className="text-lg font-black leading-tight">{assignedSupportName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-white/90 hover:bg-white/20"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs font-medium text-white/90">We are online!</p>
          </div>

          <div className="space-y-3 bg-slate-50 p-3">
            {!chatProfile ? (
              <div className="space-y-3 rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">Start secure chat</p>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-black placeholder:text-slate-400 outline-none transition focus:border-blue-400"
                />
                <input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-black placeholder:text-slate-400 outline-none transition focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Continue to chat
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="max-w-[90%] rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                Hello! Send your message here. Our support team will see it in the support panel.
              </div>
            ) : (
              messages.map((msg) => {
                const mine = msg.senderId === chatIdentity.uid;
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[90%] rounded-2xl p-3 text-sm shadow-sm ${
                      mine
                        ? 'ml-auto bg-blue-600 text-white'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    {msg.fileUrl ? (
                      <img src={msg.fileUrl} alt={msg.fileName || 'shared image'} className="max-h-48 w-auto rounded-lg" />
                    ) : null}
                    {msg.text ? <p className={msg.fileUrl ? 'mt-2' : ''}>{msg.text}</p> : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {selectedImage && (
              <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img src={selectedImage} alt="preview" className="max-h-28 rounded-md" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100">
                <ImagePlus size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={!chatProfile} />
              </label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message..."
                className="h-10 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-black placeholder:text-slate-400 outline-none transition focus:border-blue-400"
                disabled={!chatProfile}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                aria-label="Send message"
                disabled={!chatProfile}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] font-semibold tracking-wide text-slate-400">POWERED BY TWG</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open support chat"
        title="Support Chat"
        className="h-14 w-14 rounded-full bg-blue-600 text-white text-2xl font-black shadow-[0_10px_25px_rgba(37,99,235,0.45)] transition-all hover:scale-105 hover:bg-blue-500 active:scale-95"
      >
        t
      </button>
    </div>
  );
};
