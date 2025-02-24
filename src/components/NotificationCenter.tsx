import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // Connect to WebSocket server
      const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || '', {
        auth: {
          token: session.user.id,
        },
      });

      socketInstance.on('connect', () => {
        console.log('Connected to notification server');
        socketInstance.emit('authenticate', session.user.id);
      });

      socketInstance.on('notification', (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
        };

        setNotifications(prev => [newNotification, ...prev].slice(0, 5));
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [session]);

  const handleClose = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getToastBg = (type: string) => {
    switch (type) {
      case 'DOCUMENT_UPLOAD':
        return 'success';
      case 'DOCUMENT_SHARE':
        return 'info';
      case 'DOCUMENT_EXPIRING':
        return 'warning';
      case 'ACTIVITY':
        return 'primary';
      default:
        return 'light';
    }
  };

  return (
    <ToastContainer className="p-3" position="top-end">
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          onClose={() => handleClose(notification.id)}
          show={true}
          bg={getToastBg(notification.type)}
          delay={6000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">{notification.title}</strong>
            <small className="text-muted">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </small>
          </Toast.Header>
          <Toast.Body className={notification.type !== 'ACTIVITY' ? 'text-white' : ''}>
            {notification.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
} 