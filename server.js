const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store io instance globally
  global.io = io;

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Join user's personal room
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      socket.userId = userId;
      io.emit('user-status', { userId, status: 'online' });
      console.log(`👤 User ${userId} joined and is online`);
    });

    // Join a conversation room
    socket.on('join-conversation', (data) => {
      const conversationId = data.conversationId || data;
      socket.join(`conversation:${conversationId}`);
      console.log(`💬 Joined conversation: ${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave-conversation', (data) => {
      const conversationId = data.conversationId || data;
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 Left conversation: ${conversationId}`);
    });

    // Join a channel/group room
    socket.on('join-channel', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`📢 Joined channel: ${channelId}`);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId: data.userId,
        userName: data.userName,
        isTyping: data.isTyping,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        io.emit('user-status', { userId: socket.userId, status: 'offline' });
        console.log(`❌ User ${socket.userId} disconnected and is offline`);
      } else {
        console.log('❌ Client disconnected:', socket.id);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO server running on ws://${hostname}:${port}/api/socket`);
    });
});

