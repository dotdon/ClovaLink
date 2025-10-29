import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import prisma from '../prisma';
import { createLogger } from '../logger';

const logger = createLogger('websocket');

interface NotificationPayload {
  type: 'DOCUMENT_UPLOAD' | 'DOCUMENT_SHARE' | 'DOCUMENT_EXPIRING' | 'ACTIVITY';
  title: string;
  message: string;
  data?: any;
}

interface VerifiedUser {
  id: string;
  companyId: string;
  role: string;
}

let io: SocketIOServer | undefined;

export function initializeWebSocketServer(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    transports: ['websocket', 'polling'],
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.disconnect();
        return;
      }

      const verified = await getToken({
        req: {
          headers: {
            authorization: `Bearer ${token}`
          }
        } as any,
        secret: process.env.NEXTAUTH_SECRET!
      });

      if (!verified) {
        socket.disconnect();
        return;
      }

      const companyId = verified.companyId as string;
      socket.join(`company:${companyId}`);
      logger.info({ socketId: socket.id, companyId }, 'Client authenticated and joined company room');

      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Client disconnected');
      });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'WebSocket authentication error');
      socket.disconnect();
    }
  });

  global.io = io;
  return io;
}

export function getIO() {
  return io;
}

export class WebSocketService {
  private userSockets: Map<string, Set<string>> = new Map();

  constructor() {
    // This constructor is now empty as the server initialization is handled by the initializeWebSocketServer function
  }

  // Send notification to specific user
  public async sendToUser(userId: string, notification: NotificationPayload) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        io?.to(socketId).emit('notification', notification);
      }
    }
  }

  // Send notification to all users in a company
  public async sendToCompany(companyId: string, notification: NotificationPayload) {
    io?.to(`company:${companyId}`).emit('notification', notification);
  }

  // Send notification about document upload
  public async notifyDocumentUpload(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: true,
        company: true,
      },
    });

    if (!document) return;

    const notification: NotificationPayload = {
      type: 'DOCUMENT_UPLOAD',
      title: 'New Document Uploaded',
      message: `${document.uploadedBy.name} uploaded "${document.name}"`,
      data: {
        documentId,
        documentName: document.name,
        uploaderId: document.uploadedBy.id,
        uploaderName: document.uploadedBy.name,
      },
    };

    await this.sendToCompany(document.companyId, notification);
  }

  // Send notification about document expiring soon
  public async notifyDocumentExpiring(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        company: true,
      },
    });

    if (!document || !document.expiresAt) return;

    const notification: NotificationPayload = {
      type: 'DOCUMENT_EXPIRING',
      title: 'Document Expiring Soon',
      message: `Document "${document.name}" will expire on ${document.expiresAt.toLocaleDateString()}`,
      data: {
        documentId,
        documentName: document.name,
        expiryDate: document.expiresAt,
      },
    };

    await this.sendToCompany(document.companyId, notification);
  }
} 