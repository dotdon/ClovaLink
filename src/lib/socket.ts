import { Server as NetServer } from 'http';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

let io: SocketIOServer | null = null;

export const initSocketIO = (server: NetServer): SocketIOServer => {
  if (!io) {
    console.log('🔌 Initializing Socket.IO server...');
    
    io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      console.log('✅ Client connected:', socket.id);

      // Join user's personal room for direct messages
      socket.on('join', (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} joined their room`);
      });

      // Join a conversation room
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`💬 Joined conversation: ${conversationId}`);
      });

      // Leave a conversation room
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`👋 Left conversation: ${conversationId}`);
      });

      // Join a channel/group room
      socket.on('join-channel', (channelId: string) => {
        socket.join(`channel:${channelId}`);
        console.log(`📢 Joined channel: ${channelId}`);
      });

      // Typing indicator
      socket.on('typing', (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
          userId: data.userId,
          userName: data.userName,
          isTyping: data.isTyping,
        });
      });

      // Online status
      socket.on('user-online', (userId: string) => {
        io?.emit('user-status', { userId, status: 'online' });
      });

      socket.on('user-offline', (userId: string) => {
        io?.emit('user-status', { userId, status: 'offline' });
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });
  }

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

