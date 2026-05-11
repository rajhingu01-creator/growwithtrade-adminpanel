import React, { useState, useEffect, useRef } from 'react';
import {   Users, MessageSquare, Shield, Inbox, Send, LogOut, MessageCircle, Key, Plus, Trash2, Copy, Check, ImagePlus
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Conversation, Message, UserProfile } from '../../types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { socket } from '../../lib/socket';

export default function AdminDashboard() {
  const { profile, isAdmin, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'waiting' | 'team' | 'keys'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.connect();

    const fetchConvs = async () => {
      try {
        const res = await fetch('/api/admin/conversations');
        const data = await res.json();
        setConversations(data);
      } catch (err) {
        console.error('Failed to fetch conversations', err);
      }
    };

    fetchConvs();

    socket.on('conversation_updated', (updatedConv: Conversation) => {
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === updatedConv.id);
        if (index > -1) {
          const newConvs = [...prev];
          newConvs[index] = updatedConv;
          return newConvs;
        }
        return [updatedConv, ...prev];
      });

      if (selectedChat?.id === updatedConv.id) {
        setSelectedChat(updatedConv);
        setMessages(updatedConv.messages);
      }
    });

    socket.on('new_message', (data: { message: Message, convId: string }) => {
      if (selectedChat?.id === data.convId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    return () => {
      socket.off('conversation_updated');
      socket.off('new_message');
      socket.disconnect();
    };
  }, [selectedChat?.id]);

  useEffect(() => {
    if (selectedChat) {
      socket.emit('join_room', selectedChat.id);
      setMessages(selectedChat.messages);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !selectedChat || !profile) return;

    const text = inputText;
    setInputText('');

    socket.emit('send_message', {
      text,
      senderId: profile.uid,
      senderName: profile.displayName,
      convId: selectedChat.id,
      isAdmin: true,
      type: selectedImage ? 'image' : 'text',
      fileUrl: selectedImage || undefined,
      fileName: selectedImageName || undefined,
    });
    setSelectedImage(null);
    setSelectedImageName('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

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

  const handleAssignToMe = (chat: Conversation) => {
    if (!profile) return;
    socket.emit('assign_chat', { convId: chat.id, adminUid: profile.uid });
  };

  const setStatus = (status: Conversation['status']) => {
    if (!selectedChat) return;
    socket.emit('update_status', { convId: selectedChat.id, status });
  };

  const filteredConversations = conversations.filter(c => {
    if (activeTab === 'assigned') return c.assignedTo === profile?.uid;
    if (activeTab === 'waiting') return c.status === 'waiting';
    return true;
  });

  const stats = {
    waiting: conversations.filter(c => c.status === 'waiting').length,
    open: conversations.filter(c => c.status === 'open').length,
    solved: conversations.filter(c => c.status === 'solved').length,
  };

  return (
    <div className="flex h-screen bg-[#08090A] text-[#E0E0E0] overflow-hidden font-sans">
      {/* App Sidebar */}
      <div className={cn(
        "bg-[#0B0C0E] border-r border-[#1A1C1E] flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00FFA3] rounded-sm flex items-center justify-center text-black font-black italic shrink-0">
            T
          </div>
          {!sidebarCollapsed && (
            <h1 className="text-lg font-bold tracking-tight uppercase">
              TWG<span className="text-[#00FFA3]">Support</span>
            </h1>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavItem 
            icon={<Inbox size={18} />} 
            label="Live Tickets" 
            active={activeTab === 'all'} 
            onClick={() => setActiveTab('all')} 
            collapsed={sidebarCollapsed} 
            badge={stats.waiting} 
          />
          <NavItem 
            icon={<MessageSquare size={18} />} 
            label="My Assigned" 
            active={activeTab === 'assigned'} 
            onClick={() => setActiveTab('assigned')} 
            collapsed={sidebarCollapsed} 
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="Support Team" 
            active={activeTab === 'team'} 
            onClick={() => setActiveTab('team')} 
            collapsed={sidebarCollapsed} 
          />
          <NavItem 
            icon={<Key size={18} />} 
            label="API Tokens" 
            active={activeTab === 'keys'} 
            onClick={() => setActiveTab('keys')} 
            collapsed={sidebarCollapsed} 
          />
          {isAdmin && <NavItem icon={<Shield size={18} />} label="System Logs" collapsed={sidebarCollapsed} />}
        </nav>

        <div className="p-4 border-t border-[#1A1C1E]">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[#121417] border border-[#222529]">
            <div className="w-9 h-9 rounded-full bg-slate-800 border-slate-700 flex items-center justify-center text-xs font-bold">
              {profile?.displayName?.charAt(0) || 'A'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate leading-tight uppercase tracking-tight">{profile?.displayName}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Online</span>
                </div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button onClick={logout} className="text-slate-600 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat List Sidebar */}
      <div className="w-80 bg-[#0B0C0E] border-r border-[#1A1C1E] flex flex-col">
        <div className="p-4 border-b border-[#1A1C1E]">
          <div className="relative">
            <input 
              type="text" 
              placeholder="SEARCH CONVERSATIONS" 
              className="w-full bg-[#121417] border border-[#222529] px-4 py-2 text-[10px] tracking-widest uppercase focus:outline-none focus:border-[#00FFA3] transition-colors"
            />
          </div>
        </div>

        <div className="bg-[#121417] border-y border-[#1A1C1E] px-4 py-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
          Active Sessions ({filteredConversations.length})
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {filteredConversations.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "p-4 border-b border-[#1A1C1E] cursor-pointer transition-all hover:bg-[#121417]",
                selectedChat?.id === chat.id ? "bg-[#0F1115]" : ""
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-tight truncate max-w-[160px]">
                    {chat.userName || chat.userEmail || 'Client'}
                  </span>
                  {chat.projectName && (
                    <span className="text-[8px] text-[#00FFA3] font-mono uppercase tracking-tighter mt-0.5">
                      Origin: {chat.projectName}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">
                  {chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : 'NOW'}
                </span>
              </div>
              <p className={cn(
                "text-[11px] truncate mb-2 mt-2",
                chat.status === 'waiting' ? "text-[#00FFA3] font-medium" : "text-slate-400"
              )}>
                {chat.lastMessage || 'Establishing secure link...'}
              </p>
              <div className="flex items-center gap-2">
                <StatusBadge status={chat.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-[#08090A]">
        {activeTab === 'team' ? (
          <TeamManagement />
        ) : activeTab === 'keys' ? (
          <KeyManagement />
        ) : selectedChat ? (
          <div className="flex h-full">
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div className="h-14 border-b border-[#1A1C1E] px-6 flex items-center justify-between bg-[#0B0C0E]/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    selectedChat.status === 'waiting' ? "bg-orange-500" : "bg-emerald-500"
                  )} />
                  <h2 className="text-sm font-bold tracking-tight uppercase">
                    Chat with {selectedChat.userName || 'Client'} 
                  </h2>
                </div>
                <div className="flex gap-2">
                  {!selectedChat.assignedTo && (
                    <button 
                      onClick={() => handleAssignToMe(selectedChat)}
                      className="px-3 py-1 bg-[#00FFA3] text-black text-[10px] font-bold uppercase tracking-widest transition-transform active:scale-95"
                    >
                      TAKE OVER
                    </button>
                  )}
                  {selectedChat.assignedTo === profile?.uid && (
                    <button 
                      onClick={() => setStatus('solved')}
                      className="px-3 py-1 bg-[#00FFA3] text-black text-[10px] font-bold uppercase tracking-widest transition-transform active:scale-95"
                    >
                      MARK SOLVED
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-[linear-gradient(rgba(26,28,30,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(26,28,30,.02)_1px,transparent_1px)] bg-[size:40px_40px]">
                {messages.map((msg) => {
                  const isMine = msg.senderId === profile?.uid;
                  const imageSrc = msg.fileUrl || (typeof msg.text === 'string' && msg.text.startsWith('data:image/') ? msg.text : undefined);
                  return (
                    <div key={msg.id} className={cn("flex flex-col gap-2 max-w-[75%]", isMine ? "self-end items-end" : "self-start items-start")}>
                      <div className="flex items-center gap-2">
                        {!isMine && <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedChat.userName || 'User'}</span>}
                        <span className="text-[9px] text-slate-600 font-mono">
                          {msg.createdAt && format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <div className={cn(
                        "p-4 border text-sm leading-relaxed",
                        isMine 
                          ? "bg-[#00FFA3] text-black border-[#00FFA3] rounded-tl-xl rounded-bl-xl rounded-br-xl font-medium" 
                          : "bg-[#161B22] text-[#E0E0E0] border-[#222529] rounded-tr-xl rounded-br-xl rounded-bl-xl"
                      )}>
                        {imageSrc ? (
                          <img src={imageSrc} alt={msg.fileName || 'shared image'} className="max-h-64 w-auto rounded-md" />
                        ) : null}
                        {msg.text && !msg.text.startsWith('data:image/') ? <p className={imageSrc ? 'mt-2' : ''}>{msg.text}</p> : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-[#1A1C1E] bg-[#0B0C0E]">
                {!selectedChat.assignedTo ? (
                  <div className="text-center py-6 bg-[#121417] border border-dashed border-[#222529] rounded-lg">
                    <button 
                      onClick={() => handleAssignToMe(selectedChat)}
                      className="text-[11px] font-bold text-[#00FFA3] hover:underline uppercase tracking-wider"
                    >
                      Assign identity to chat session
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    {selectedImage && (
                      <div className="rounded-lg border border-[#222529] bg-[#121417] p-2">
                        <img src={selectedImage} alt="preview" className="max-h-28 rounded-md" />
                      </div>
                    )}
                    <div className="relative flex items-center bg-[#121417] border border-[#222529] rounded-lg px-4 py-3 group focus-within:border-[#00FFA3] transition-colors">
                    <label className="mr-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:text-[#00FFA3]">
                      <ImagePlus size={16} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`REPLY TO ${selectedChat.userName?.toUpperCase() || 'USER'}...`} 
                      className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-600 placeholder:tracking-wider placeholder:text-[10px] placeholder:uppercase"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim() && !selectedImage}
                      className="text-[#00FFA3] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 transition-all active:scale-95"
                    >
                      Transmit
                    </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-[#0B0C0E] border border-[#1A1C1E] rounded-xs flex items-center justify-center mb-6">
              <MessageCircle size={32} className="text-slate-800" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 tracking-tight uppercase italic">Awaiting Transmission</h2>
            <p className="text-slate-600 max-w-xs font-mono text-[10px] uppercase">
              Select a secure communication stream from the sidebar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed, badge }: { icon: any, label: string, active?: boolean, onClick?: () => void, collapsed: boolean, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all group relative uppercase tracking-widest",
        active ? "bg-[#00FFA3]/10 text-[#00FFA3]" : "text-slate-500 hover:bg-[#121417] hover:text-[#E0E0E0]"
      )}
    >
      {icon}
      {!collapsed && <span className="flex-1 text-[10px] font-bold text-left">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-[#00FFA3] text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm">{badge}</span>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: Conversation['status'] }) {
  const styles = {
    open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    waiting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    solved: "bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/20",
    closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return (
    <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border", styles[status])}>
      {status}
    </span>
  );
}

function TeamManagement() {
  const team = [
    { email: 'dishahingu3007@gmail.com', name: 'Disha Hingu', role: 'admin' },
    { email: 'rajhingu01@gmail.com', name: 'Raj Hingu', role: 'admin' },
    { email: 'tishakothiya61@gmail.com', name: 'Tisha Kothiya', role: 'admin' },
    { email: 'bhavanahingu277@gmail.com', name: 'Bhavana Hingu', role: 'admin' }
  ];

  return (
    <div className="p-8 max-w-5xl">
       <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">Support Network</h2>
      <div className="bg-[#0B0C0E] border border-[#1A1C1E] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#121417] text-[10px] uppercase tracking-widest text-slate-500 font-mono">
            <tr>
              <th className="px-6 py-4">Operator</th>
              <th className="px-6 py-4">Auth Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1C1E]">
            {team.map(member => (
              <tr key={member.email} className="hover:bg-[#0F1115] transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs uppercase tracking-tight">{member.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{member.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-[#00FFA3]/30 text-[#00FFA3] bg-[#00FFA3]/5 rounded-sm">
                     {member.role}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeyManagement() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = async () => {
    const res = await fetch('/api/admin/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    setNewName('');
    fetchKeys();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
    fetchKeys();
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Access Tokens</h2>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Connect external domains to TWG Core</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mb-12 flex gap-4">
        <input 
          type="text" 
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="ENTER SITE/PROJECT NAME (E.G. BINARY_PRO_V2)"
          className="flex-1 bg-[#0B0C0E] border border-[#1A1C1E] px-6 py-4 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#00FFA3] transition-all"
        />
        <button className="bg-[#00FFA3] text-black font-black uppercase text-xs tracking-widest px-8 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
          <Plus size={16} /> GENERATE KEY
        </button>
      </form>

      <div className="space-y-4">
        {projects.map(p => (
          <div key={p.id} className="bg-[#0B0C0E] border border-[#1A1C1E] p-6 flex items-center justify-between hover:border-[#00FFA3]/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 bg-[#121417] border border-[#1A1C1E] flex items-center justify-center text-[#00FFA3]">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest italic mb-1">{p.name}</h3>
                <div className="flex items-center gap-3">
                   <code className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-1 select-all">{p.apiKey}</code>
                   <button 
                    onClick={() => copyToClipboard(p.id, p.apiKey)}
                    className="text-slate-600 hover:text-[#00FFA3] transition-colors"
                   >
                     {copiedId === p.id ? <Check size={14} className="text-[#00FFA3]" /> : <Copy size={14} />}
                   </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
               <div className="text-right">
                  <p className="text-[8px] text-slate-600 uppercase font-mono mb-1">Status</p>
                  <span className="text-[10px] font-black uppercase text-[#00FFA3] tracking-tighter italic">Authorized</span>
               </div>
               <button 
                onClick={() => handleDelete(p.id)}
                className="text-slate-700 hover:text-red-500 transition-colors p-2"
               >
                 <Trash2 size={18} />
               </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 p-8 border border-dashed border-[#1A1C1E] bg-[#00FFA3]/[0.02]">
         <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
           <span className="w-2 h-2 bg-[#00FFA3] rounded-full" /> Integration Protocol
         </h4>
         <div className="space-y-4 font-mono text-[10px] text-slate-500 leading-relaxed uppercase">
            <p>1. Copy the authentication token generated above.</p>
            <p>2. Paste the following script into the footer of your external application:</p>
            <div className="bg-black/40 p-4 border border-[#1A1C1E] text-slate-400 normal-case">
               <code>{`<script src="${window.location.origin}/widget.js" data-token="YOUR_TOKEN_HERE"></script>`}</code>
            </div>
            <p className="text-[#00FFA3]/60 italic font-bold">Caution: Keep your live tokens secure. Unauthorized exposure may bridge core systems.</p>
         </div>
      </div>
    </div>
  );
}
