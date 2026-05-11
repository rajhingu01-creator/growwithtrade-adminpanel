import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'binary-core-secret-2024';

// Mock DB structure
interface Message {
  id: string;
  senderId: string;
  text: string;
  type?: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: Date;
}

interface Conversation {
  id: string;
  userEmail: string;
  userName: string;
  projectId?: string; // Link to project
  projectName?: string;
  status: 'open' | 'waiting' | 'solved' | 'closed';
  assignedTo?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  messages: Message[];
}

const conversations: Map<string, Conversation> = new Map();
const users = [
  { email: 'dishahingu3007@gmail.com', password: 'Admin@#1234', name: 'Disha Hingu', role: 'admin' },
  { email: 'rajhingu01@gmail.com', password: 'Admin@#1234', name: 'Raj Hingu', role: 'admin' },
  { email: 'tishakothiya61@gmail.com', password: 'Admin@#1234', name: 'Tisha Kothiya', role: 'admin' },
  { email: 'bhavanahingu277@gmail.com', password: 'Admin@#1234', name: 'Bhavana Hingu', role: 'admin' }
];

interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: Date;
}

const projects: Project[] = [
  { id: '1', name: 'Main Trading Site', apiKey: 'twg_live_8f3k2l9s0a', createdAt: new Date() }
];

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());

  // Verify API Key Middleware
  const verifyApiKey = (apiKey: string) => {
    return projects.find(p => p.apiKey === apiKey);
  };

  // --- API ROUTES ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      const token = jwt.sign({ 
        email: user.email, 
        role: user.role, 
        name: user.name,
        uid: user.email 
      }, JWT_SECRET);
      res.json({ token, user: { ...user, uid: user.email, password: undefined } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Get conversations (Admin)
  app.get('/api/admin/conversations', (req, res) => {
    const list = Array.from(conversations.values());
    res.json(list);
  });

  // Get user messages
  app.get('/api/user/messages', (req, res) => {
    const email = req.query.email as string;
    const conv = Array.from(conversations.values()).find(c => c.userEmail === email);
    res.json(conv ? conv.messages : []);
  });

  // API Key Management
  app.get('/api/admin/projects', (req, res) => {
    res.json(projects);
  });

  app.post('/api/admin/projects', (req, res) => {
    const { name } = req.body;
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      apiKey: `twg_live_${Math.random().toString(36).substr(2, 10)}`,
      createdAt: new Date()
    };
    projects.push(newProject);
    res.json(newProject);
  });

  app.delete('/api/admin/projects/:id', (req, res) => {
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index > -1) {
      projects.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  // --- SOCKET.IO ---
  io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
    });

    socket.on('send_message', async (data) => {
      const { text, senderId, senderName, userEmail, isAdmin, apiKey, type, fileUrl, fileName } = data;
      const rawText = typeof text === 'string' ? text : '';
      const imageFromText = rawText.startsWith('data:image/') ? rawText : undefined;
      const normalizedFileUrl = fileUrl || data?.imageUrl || imageFromText;
      const normalizedType = type || (normalizedFileUrl ? 'image' : 'text');
      const normalizedText = normalizedFileUrl && imageFromText === rawText ? '' : rawText;
      
      // If guest, validate API Key
      let project = null;
      if (!isAdmin && apiKey) {
        project = verifyApiKey(apiKey);
        if (!project) {
          socket.emit('error', { message: 'INVALID_API_KEY' });
          return;
        }
      }

      let convId = isAdmin ? data.convId : userEmail;
      let conv = conversations.get(convId);

      if (!conv && !isAdmin) {
        conv = {
          id: userEmail,
          userEmail: userEmail,
          userName: senderName || userEmail.split('@')[0],
          projectId: project?.id,
          projectName: project?.name,
          status: 'waiting',
          messages: [],
          lastMessage: normalizedText || (normalizedType === 'image' ? 'Image' : ''),
          lastMessageAt: new Date()
        };
        conversations.set(userEmail, conv);
      }

      if (conv) {
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          senderId,
          text: normalizedText,
          type: normalizedType,
          fileUrl: normalizedFileUrl,
          fileName,
          createdAt: new Date()
        };
        
        conv.messages.push(newMessage);
        conv.lastMessage = normalizedText || (normalizedType === 'image' ? 'Image' : '');
        conv.lastMessageAt = newMessage.createdAt;
        if (!isAdmin) conv.status = 'waiting';

        io.to(convId).emit('new_message', { message: newMessage, convId });
        io.emit('conversation_updated', conv);
      }
    });

    socket.on('assign_chat', ({ convId, adminUid }) => {
      const conv = conversations.get(convId);
      if (conv) {
        conv.assignedTo = adminUid;
        conv.status = 'open';
        io.emit('conversation_updated', conv);
      }
    });

    socket.on('update_status', ({ convId, status }) => {
      const conv = conversations.get(convId);
      if (conv) {
        conv.status = status;
        io.emit('conversation_updated', conv);
      }
    });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
