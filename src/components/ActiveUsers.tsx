'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaCircle } from 'react-icons/fa';

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  lastActivityAt: string;
  company: {
    name: string;
  };
}

export default function ActiveUsers() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('/api/auth/active-users');
      if (response.ok) {
        const data = await response.json();
        setActiveUsers(data.activeUsers || []);
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUsers();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="active-users">
        <div className="active-users-header">
          <FaCircle className="header-icon" />
          <h3>Active Now</h3>
        </div>
        <div className="loading-text">Loading...</div>
        <style jsx>{`
          .active-users {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }
          .loading-text {
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
            padding: 1rem;
          }
          .active-users-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .header-icon {
            color: #28a745;
            font-size: 0.75rem;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
          .active-users-header h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  if (activeUsers.length === 0) {
    return (
      <div className="active-users">
        <div className="active-users-header">
          <FaCircle className="header-icon" />
          <h3>Active Now</h3>
        </div>
        <div className="no-users">No users currently active</div>
        <style jsx>{`
          .active-users {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }
          .active-users-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .header-icon {
            color: #28a745;
            font-size: 0.75rem;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
          .active-users-header h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0;
          }
          .no-users {
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
            padding: 1rem;
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="active-users">
      <div className="active-users-header">
        <FaCircle className="header-icon" />
        <h3>Active Now</h3>
        <span className="user-count">{activeUsers.length}</span>
      </div>
      <div className="users-list">
        {activeUsers.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-avatar">
              {user.profilePicture ? (
                <img
                  src={`/api/employees/profile-picture/${user.profilePicture}`}
                  alt={user.name}
                />
              ) : (
                <FaUser className="avatar-icon" />
              )}
              <span className="online-dot"></span>
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-company">{user.company.name}</div>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .active-users {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .active-users-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-icon {
          color: #28a745;
          font-size: 0.75rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .active-users-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
          flex: 1;
        }

        .user-count {
          background: rgba(40, 167, 69, 0.2);
          color: #28a745;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .users-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .users-list::-webkit-scrollbar {
          width: 6px;
        }

        .users-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .users-list::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 3px;
        }

        .user-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .user-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .user-avatar {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #28a745;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-icon {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 0.9rem;
          padding: 0.5rem;
        }

        .online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background: #28a745;
          border: 2px solid #000;
          border-radius: 50%;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-company {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 767px) {
          .active-users {
            padding: 0.75rem;
          }

          .users-list {
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}

