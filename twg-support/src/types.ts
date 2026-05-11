export type UserRole = 'user' | 'agent' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  status: 'online' | 'offline';
  lastSeen: any;
  createdAt: any;
}

export interface Conversation {
  id: string;
  userId: string;
  agentId?: string;
  assignedTo?: string;
  status: 'open' | 'waiting' | 'solved' | 'closed';
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt: any;
  rating?: number;
  internalNotes?: string;
  userEmail?: string;
  userName?: string;
  messages: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: any;
  status: 'sent' | 'delivered' | 'read';
}
