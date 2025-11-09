'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Form, Modal, Badge } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPaperPlane, FaFile, FaUser, FaSearch, FaBell, FaPaperclip, FaTimes, FaCheck, FaCheckDouble, FaSmile } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string | null;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string | null;
  };
  recipient?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string | null;
  };
  attachments?: Array<{
    id: string;
    document: {
      id: string;
      name: string;
      mimeType: string;
      size: number;
    };
  }>;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  lastLoginAt?: string | null;
  isActive?: boolean;
}

interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Employee | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const emojis = ['😊', '😂', '❤️', '👍', '👏', '🎉', '🔥', '💯', '✅', '❌', '🤔', '😎', '🙌', '💪', '👌', '🎯', '📁', '📄', '💼', '⭐'];

  useEffect(() => {
    fetchEmployees();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedRecipient) {
      fetchMessages(selectedRecipient.id);
      // Mark messages as read
      markMessagesAsRead();
    }
  }, [selectedRecipient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (selectedRecipient) {
      const interval = setInterval(() => {
        fetchMessages(selectedRecipient.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRecipient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchEmployees = async () => {
    try {
      // Fetch employees with proper company access filtering
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        
        // Filter out current user and only show employees from accessible companies
        const accessibleEmployees = data.filter((emp: Employee) => {
          if (emp.id === session?.user?.id) return false;
          
          // If admin, can message everyone
          if (session?.user?.role === 'ADMIN') return true;
          
          // If manager or user, can only message people in their company
          return emp.companyId === session?.user?.companyId;
        });
        
        setEmployees(accessibleEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (recipientId: string) => {
    try {
      const response = await fetch(`/api/messages?recipientId=${recipientId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Fetch documents based on company access
      const companiesResponse = await fetch('/api/employees/me/accessible-companies');
      let companyIds: string[] = [];
      
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        companyIds = companiesData.companies?.map((c: any) => c.id) || [];
      }
      
      // Fetch all documents (API will filter by permissions)
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const markMessagesAsRead = async () => {
    const unreadMessages = messages.filter(m => !m.isRead && m.recipientId === session?.user?.id);
    if (unreadMessages.length > 0) {
      try {
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: unreadMessages.map(m => m.id) }),
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if ((!messageContent || !messageContent.trim()) && selectedDocuments.length === 0) {
      console.log('No content to send');
      return;
    }
    if (!selectedRecipient) {
      console.log('No recipient selected');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Sending message:', {
        content: messageContent,
        recipientId: selectedRecipient.id,
        documentIds: selectedDocuments,
      });
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent || '',
          recipientId: selectedRecipient.id,
          documentIds: selectedDocuments,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Message sent successfully:', result);
        setMessageContent('');
        setSelectedDocuments([]);
        setShowEmojiPicker(false);
        await fetchMessages(selectedRecipient.id);
        fetchConversations();
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert('Failed to send message: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachDocument = () => {
    fetchDocuments();
    setShowDocumentModal(true);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const addEmoji = (emoji: string) => {
    setMessageContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnreadCount = (recipientId: string) => {
    return conversations.filter(
      msg =>
        !msg.isRead &&
        msg.senderId === recipientId &&
        msg.recipientId === session?.user?.id
    ).length;
  };

  return (
    <DashboardLayout>
      <div className="messages-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-icon">
            <FaBell />
          </div>
          <div className="header-text">
            <h1>Messages</h1>
            <p className="header-subtitle">Chat with your team members</p>
          </div>
        </div>

        <div className="messages-container">
          {/* Sidebar - Conversations List */}
          <div className="conversations-sidebar">
            <div className="sidebar-header">
              <h3 className="sidebar-title">Conversations</h3>
              <div className="search-bar">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-info">
                {session?.user?.role === 'ADMIN' ? (
                  <span>All employees ({filteredEmployees.length})</span>
                ) : (
                  <span>Your company ({filteredEmployees.length})</span>
                )}
              </div>
            </div>

            <div className="conversations-list">
              {filteredEmployees.map((employee) => {
                const unreadCount = getUnreadCount(employee.id);
                return (
                  <div
                    key={employee.id}
                    className={`conversation-item ${selectedRecipient?.id === employee.id ? 'active' : ''}`}
                    onClick={() => setSelectedRecipient(employee)}
                  >
                    <div className="conversation-avatar">
                      {employee.profilePicture ? (
                        <img
                          src={`/api/employees/profile-picture/${employee.profilePicture}`}
                          alt={employee.name}
                        />
                      ) : (
                        <FaUser className="avatar-icon" />
                      )}
                      {employee.isActive && <span className="online-indicator"></span>}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">{employee.name}</div>
                      <div className="conversation-email">{employee.email}</div>
                    </div>
                    {unreadCount > 0 && (
                      <Badge bg="danger" className="unread-badge">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {selectedRecipient ? (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-recipient">
                    <div className="recipient-avatar">
                      {selectedRecipient.profilePicture ? (
                        <img
                          src={`/api/employees/profile-picture/${selectedRecipient.profilePicture}`}
                          alt={selectedRecipient.name}
                        />
                      ) : (
                        <FaUser className="avatar-icon" />
                      )}
                    </div>
                    <div>
                      <div className="recipient-name">{selectedRecipient.name}</div>
                      <div className="recipient-status">
                        {selectedRecipient.isActive ? (
                          <span className="status-online">● Online</span>
                        ) : (
                          <span className="status-offline">○ Offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="messages-list">
                  {messages.map((message) => {
                    const isSent = message.senderId === session?.user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`message-bubble ${isSent ? 'sent' : 'received'}`}
                      >
                        {!isSent && (
                          <div className="message-avatar">
                            {message.sender.profilePicture ? (
                              <img
                                src={`/api/employees/profile-picture/${message.sender.profilePicture}`}
                                alt={message.sender.name}
                              />
                            ) : (
                              <FaUser className="avatar-icon-small" />
                            )}
                          </div>
                        )}
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="message-attachments">
                              {message.attachments.map((att) => (
                                <div key={att.id} className="attachment-item">
                                  <FaFile className="file-icon" />
                                  <span>{att.document.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isSent && (
                              <span className="read-status">
                                {message.isRead ? (
                                  <FaCheckDouble className="read" />
                                ) : (
                                  <FaCheck className="sent" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="message-input-container">
                  {selectedDocuments.length > 0 && (
                    <div className="selected-documents">
                      {selectedDocuments.map((docId) => {
                        const doc = documents.find(d => d.id === docId);
                        return doc ? (
                          <div key={docId} className="selected-doc">
                            <FaFile className="file-icon" />
                            <span>{doc.name}</span>
                            <button
                              className="remove-doc"
                              onClick={() => toggleDocumentSelection(docId)}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="input-wrapper">
                    <button
                      type="button"
                      className="attach-btn"
                      onClick={handleAttachDocument}
                      title="Attach document"
                    >
                      <FaPaperclip />
                    </button>
                    <button
                      type="button"
                      className="emoji-btn"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="Add emoji"
                    >
                      <FaSmile />
                    </button>
                    {showEmojiPicker && (
                      <div className="emoji-picker">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            className="emoji-option"
                            onClick={() => addEmoji(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      className="message-input"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="send-btn"
                      onClick={() => handleSendMessage()}
                      disabled={isLoading || (!messageContent?.trim() && selectedDocuments.length === 0)}
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-conversation-selected">
                <FaBell className="empty-icon" />
                <h3>Select a conversation</h3>
                <p>Choose a team member from the list to start messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Attachment Modal */}
        <Modal show={showDocumentModal} onHide={() => setShowDocumentModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Attach Documents</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="documents-grid">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`document-item ${selectedDocuments.includes(doc.id) ? 'selected' : ''}`}
                  onClick={() => toggleDocumentSelection(doc.id)}
                >
                  <FaFile className="doc-icon" />
                  <div className="doc-name">{doc.name}</div>
                  {selectedDocuments.includes(doc.id) && (
                    <div className="selected-checkmark">
                      <FaCheck />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDocumentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowDocumentModal(false)}>
              Attach ({selectedDocuments.length})
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .messages-page {
            padding: 1rem;
            height: calc(100vh - 80px);
            display: flex;
            flex-direction: column;
          }

          .page-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1.5rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }

          .header-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
          }

          .header-text h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #ffffff;
          }

          .header-subtitle {
            margin: 0.25rem 0 0 0;
            color: rgba(255, 255, 255, 0.75);
            font-size: 0.95rem;
          }

          .messages-container {
            display: flex;
            gap: 1rem;
            flex: 1;
            min-height: 0;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 16px;
            overflow: hidden;
          }

          .conversations-sidebar {
            width: 320px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            background: rgba(0, 0, 0, 0.2);
          }

          .sidebar-header {
            padding: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .sidebar-title {
            color: #ffffff;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 0.75rem 0;
          }

          .filter-info {
            margin-top: 0.75rem;
            padding: 0.5rem;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 6px;
            text-align: center;
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.7);
          }

          .search-bar {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
          }

          .search-icon {
            color: #ffffff;
            font-size: 0.9rem;
          }

          .search-input {
            background: transparent;
            border: none;
            color: white;
            font-size: 0.9rem;
            outline: none;
            width: 100%;
          }

          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .conversations-list {
            flex: 1;
            overflow-y: auto;
          }

          .conversation-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .conversation-item:hover {
            background: rgba(255, 255, 255, 0.05);
          }

          .conversation-item.active {
            background: rgba(102, 126, 234, 0.2);
            border-left: 3px solid #667eea;
          }

          .conversation-avatar {
            position: relative;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #667eea;
            flex-shrink: 0;
          }

          .conversation-avatar img {
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
            font-size: 1.2rem;
            padding: 0.75rem;
          }

          .online-indicator {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            background: #28a745;
            border: 2px solid #000;
            border-radius: 50%;
          }

          .conversation-info {
            flex: 1;
            min-width: 0;
          }

          .conversation-name {
            font-weight: 600;
            color: #ffffff;
            font-size: 0.95rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .conversation-email {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .unread-badge {
            background: #dc3545 !important;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
          }

          .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .chat-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
          }

          .chat-recipient {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .recipient-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #667eea;
          }

          .recipient-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .recipient-name {
            font-weight: 600;
            color: #ffffff;
            font-size: 1rem;
          }

          .recipient-status {
            font-size: 0.85rem;
          }

          .status-online {
            color: #28a745;
          }

          .status-offline {
            color: rgba(255, 255, 255, 0.5);
          }

          .messages-list {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .message-bubble {
            display: flex;
            gap: 0.5rem;
            max-width: 70%;
            animation: fadeIn 0.3s ease;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .message-bubble.sent {
            align-self: flex-end;
            flex-direction: row-reverse;
          }

          .message-bubble.received {
            align-self: flex-start;
          }

          .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
          }

          .message-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-icon-small {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 0.8rem;
            padding: 0.5rem;
          }

          .message-content {
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 12px;
            padding: 0.75rem 1rem;
            word-wrap: break-word;
          }

          .message-bubble.sent .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
          }

          .message-text {
            color: #ffffff;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 0.25rem;
          }

          .message-attachments {
            margin-top: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .attachment-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            font-size: 0.85rem;
            color: #ffffff;
          }

          .file-icon {
            color: #667eea;
          }

          .message-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.25rem;
          }

          .message-time {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
          }

          .read-status {
            font-size: 0.85rem;
          }

          .read-status .read {
            color: #28a745;
          }

          .read-status .sent {
            color: rgba(255, 255, 255, 0.6);
          }

          .message-input-container {
            padding: 1rem 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
          }

          .selected-documents {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 0.75rem;
          }

          .selected-doc {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            color: #ffffff;
          }

          .remove-doc {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
          }

          .remove-doc:hover {
            color: #dc3545;
          }

          .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            padding: 0.5rem 1rem;
          }

          .attach-btn, .send-btn, .emoji-btn {
            background: none;
            border: none;
            color: #667eea;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 0.5rem;
            display: flex;
            align-items: center;
            transition: all 0.3s ease;
            flex-shrink: 0;
          }

          .attach-btn:hover, .send-btn:hover, .emoji-btn:hover {
            color: #764ba2;
            transform: scale(1.1);
          }

          .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }

          .emoji-picker {
            position: absolute;
            bottom: 100%;
            left: 60px;
            background: rgba(20, 20, 40, 0.98);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 12px;
            padding: 0.75rem;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 0.5rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            margin-bottom: 0.5rem;
            z-index: 1000;
          }

          .emoji-option {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .emoji-option:hover {
            background: rgba(102, 126, 234, 0.2);
            transform: scale(1.2);
          }

          .message-input {
            flex: 1;
            background: transparent;
            border: none;
            color: white;
            font-size: 0.95rem;
            outline: none;
            padding: 0.25rem 0;
          }

          .message-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .no-conversation-selected {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
          }

          .empty-icon {
            font-size: 4rem;
            color: rgba(102, 126, 234, 0.4);
            margin-bottom: 1rem;
          }

          .no-conversation-selected h3 {
            color: #ffffff;
            margin-bottom: 0.5rem;
          }

          .documents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
            max-height: 400px;
            overflow-y: auto;
          }

          .document-item {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
          }

          .document-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #667eea;
          }

          .document-item.selected {
            background: rgba(102, 126, 234, 0.2);
            border-color: #667eea;
          }

          .doc-icon {
            font-size: 2rem;
            color: #667eea;
          }

          .doc-name {
            color: #ffffff;
            font-size: 0.85rem;
            word-wrap: break-word;
            max-width: 100%;
          }

          .selected-checkmark {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: #28a745;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
          }

          @media (max-width: 1023px) {
            .messages-page {
              padding: 0.5rem;
            }

            .page-header {
              flex-direction: column;
              align-items: center;
              padding: 1rem;
              text-align: center;
            }

            .header-icon {
              width: 42px;
              height: 42px;
              font-size: 1.1rem;
            }

            .header-text h1 {
              font-size: 1.35rem;
            }

            .header-subtitle {
              font-size: 0.8rem;
            }

            .messages-container {
              flex-direction: column;
            }

            .conversations-sidebar {
              width: 100%;
              max-height: 200px;
              border-right: none;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-area {
              height: calc(100vh - 400px);
            }

            .message-bubble {
              max-width: 85%;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

