'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Form, Modal, Badge } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPaperPlane, FaFile, FaUser, FaSearch, FaBell, FaPaperclip, FaTimes, FaCheck, FaCheckDouble, FaSmile, FaUsers, FaPlus, FaUserPlus, FaFilter, FaLock, FaDownload, FaSave, FaEye, FaFilePdf, FaTrash, FaClock } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { 
  generateKeyPair, 
  encryptMessage, 
  decryptMessage, 
  storePrivateKey, 
  getPrivateKey,
  isEncryptionAvailable 
} from '@/lib/encryption';

interface Message {
  id: string;
  content: string;
  encryptedKey?: string | null;
  iv?: string | null;
  isEncrypted?: boolean;
  senderId: string;
  recipientId: string | null;
  channelId: string | null;
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
  companyId?: string;
  profilePicture?: string | null;
  lastLoginAt?: string | null;
  isActive?: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string | null;
  companyId: string;
  isPublic: boolean;
  members: Array<{
    id: string;
    isAdmin: boolean;
    employee: Employee;
  }>;
  messages?: Array<{
    sender: {
      name: string;
    };
    content: string;
    createdAt: string;
  }>;
}

interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Employee | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSaveDocumentModal, setShowSaveDocumentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [documentToSave, setDocumentToSave] = useState<Document | null>(null);
  const [saveToCompanyId, setSaveToCompanyId] = useState<string>('');
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [disappearAfter, setDisappearAfter] = useState<number>(0); // 0 = never, in seconds
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Encryption state
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<{[key: string]: string}>({});
  
  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const emojis = ['😊', '😂', '❤️', '👍', '👏', '🎉', '🔥', '💯', '✅', '❌', '🤔', '😎', '🙌', '💪', '👌', '🎯', '📁', '📄', '💼', '⭐'];

  // Initialize encryption keys
  useEffect(() => {
    const initializeEncryption = async () => {
      if (!session?.user?.id || !isEncryptionAvailable()) {
        console.warn('Encryption not available or user not logged in');
        return;
      }

      try {
        // Check if user has a private key stored locally
        let privateKey = getPrivateKey(session.user.id);
        
        if (!privateKey) {
          console.log('🔐 Generating new encryption keys...');
          // Generate new key pair
          const keys = await generateKeyPair();
          privateKey = keys.privateKey;
          
          // Store private key locally
          storePrivateKey(session.user.id, privateKey);
          
          // Store public key on server
          await fetch('/api/encryption/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: keys.publicKey }),
          });
          
          console.log('✅ Encryption keys generated and stored');
        } else {
          console.log('✅ Using existing encryption keys');
        }
        
        setEncryptionReady(true);
      } catch (error) {
        console.error('Error initializing encryption:', error);
        setEncryptionReady(false);
      }
    };

    initializeEncryption();
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAccessibleCompanies();
    fetchEmployees();
    fetchConversations();
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedRecipient && activeTab === 'direct') {
      fetchMessages(selectedRecipient.id);
      markMessagesAsRead();
    }
  }, [selectedRecipient, activeTab]);

  useEffect(() => {
    if (selectedChannel && activeTab === 'groups') {
      fetchChannelMessages(selectedChannel.id);
    }
  }, [selectedChannel, activeTab]);

  // Decrypt messages when they change
  useEffect(() => {
    const decryptAllMessages = async () => {
      if (!session?.user?.id || !encryptionReady || messages.length === 0) {
        return;
      }

      const privateKey = getPrivateKey(session.user.id);
      if (!privateKey) {
        console.warn('No private key available for decryption');
        return;
      }

      const newDecrypted: {[key: string]: string} = {};

      for (const message of messages) {
        // Skip if already decrypted
        if (decryptedMessages[message.id]) {
          newDecrypted[message.id] = decryptedMessages[message.id];
          continue;
        }

        // Skip if not encrypted or missing encryption data
        if (!message.isEncrypted || !message.encryptedKey || !message.iv) {
          newDecrypted[message.id] = message.content;
          continue;
        }

        try {
          const decrypted = await decryptMessage(
            message.content,
            message.encryptedKey,
            message.iv,
            privateKey
          );
          newDecrypted[message.id] = decrypted;
        } catch (error) {
          console.error('Error decrypting message:', message.id, error);
          newDecrypted[message.id] = '[🔒 Unable to decrypt message]';
        }
      }

      setDecryptedMessages(newDecrypted);
    };

    decryptAllMessages();
  }, [messages, session?.user?.id, encryptionReady]);

  useEffect(() => {
    // Only scroll messages container, not the whole page
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 10 seconds (reduced from 5s for better performance)
  useEffect(() => {
    if (selectedRecipient && activeTab === 'direct') {
      const interval = setInterval(() => {
        fetchMessages(selectedRecipient.id);
      }, 10000);
      return () => clearInterval(interval);
    } else if (selectedChannel && activeTab === 'groups') {
      const interval = setInterval(() => {
        fetchChannelMessages(selectedChannel.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedRecipient, selectedChannel, activeTab]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Use scrollIntoView with block: 'nearest' to prevent page scroll
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  const fetchAccessibleCompanies = async () => {
    try {
      const response = await fetch('/api/employees/me/accessible-companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.filter((emp: Employee) => emp.id !== session?.user?.id));
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

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/messages/channels');
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
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

  const fetchChannelMessages = async (channelId: string) => {
    try {
      const response = await fetch(`/api/messages?channelId=${channelId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching channel messages:', error);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      // Fetch all documents from accessible companies
      const companiesResponse = await fetch('/api/employees/me/accessible-companies');
      if (!companiesResponse.ok) {
        console.error('Failed to fetch accessible companies');
        setDocuments([]);
        return;
      }

      const companiesData = await companiesResponse.json();
      const companyIds = companiesData.companies?.map((c: any) => c.id) || [];
      
      if (companyIds.length === 0) {
        console.log('No accessible companies found');
        setDocuments([]);
        return;
      }

      console.log('Fetching documents from companies:', companyIds);

      // Fetch documents for each company
      const allDocuments: Document[] = [];
      
      for (const companyId of companyIds) {
        try {
          const response = await fetch(`/api/documents?companyId=${companyId}`);
          if (response.ok) {
            const data = await response.json();
            
            // Extract documents from folders recursively
            const extractDocumentsFromFolders = (folders: any[]): Document[] => {
              let docs: Document[] = [];
              if (!Array.isArray(folders)) return docs;
              
              folders.forEach(folder => {
                // Add documents from current folder
                if (Array.isArray(folder.documents)) {
                  docs.push(...folder.documents);
                }
                // Recursively extract from children folders
                if (Array.isArray(folder.children)) {
                  docs.push(...extractDocumentsFromFolders(folder.children));
                }
              });
              
              return docs;
            };

            // Get documents from folders
            const folderDocs = extractDocumentsFromFolders(data.folders || []);
            
            // Get unorganized documents
            const unorganizedDocs = Array.isArray(data.unorganizedDocuments) 
              ? data.unorganizedDocuments 
              : [];

            // Combine all documents
            const companyDocs = [...folderDocs, ...unorganizedDocs];
            
            console.log(`Found ${companyDocs.length} documents in company ${companyId}`);
            allDocuments.push(...companyDocs);
          } else {
            console.error(`Failed to fetch documents for company ${companyId}:`, response.status);
          }
        } catch (err) {
          console.error(`Error fetching documents for company ${companyId}:`, err);
        }
      }

      console.log(`Total documents found: ${allDocuments.length}`);
      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
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
      return;
    }

    if (!encryptionReady) {
      alert('Encryption is still initializing. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    try {
      let encryptedContent = messageContent || '📎 Attachment';
      let encryptedKey: string | null = null;
      let iv: string | null = null;
      let isEncrypted = false;

      // Encrypt message for direct messages
      if (activeTab === 'direct' && selectedRecipient) {
        try {
          // Fetch recipient's public key
          const keyResponse = await fetch(`/api/encryption/keys?userId=${selectedRecipient.id}`);
          if (keyResponse.ok) {
            const keyData = await keyResponse.json();
            
            if (keyData.publicKey) {
              // Encrypt the message
              const encrypted = await encryptMessage(messageContent || '📎 Attachment', keyData.publicKey);
              encryptedContent = encrypted.encryptedContent;
              encryptedKey = encrypted.encryptedKey;
              iv = encrypted.iv;
              isEncrypted = true;
              console.log('🔐 Message encrypted');
            } else {
              console.warn('Recipient has no public key, sending unencrypted');
              isEncrypted = false;
            }
          }
        } catch (error) {
          console.error('Error encrypting message:', error);
          alert('Failed to encrypt message. Sending unencrypted. Continue?');
          isEncrypted = false;
        }
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: encryptedContent,
          encryptedKey,
          iv,
          isEncrypted,
          recipientId: activeTab === 'direct' ? selectedRecipient?.id : null,
          channelId: activeTab === 'groups' ? selectedChannel?.id : null,
          documentIds: selectedDocuments,
          disappearAfter: disappearAfter > 0 ? disappearAfter : null,
        }),
      });

      if (response.ok) {
        setMessageContent('');
        setSelectedDocuments([]);
        setShowEmojiPicker(false);
        setDisappearAfter(0);
        
        if (activeTab === 'direct' && selectedRecipient) {
          await fetchMessages(selectedRecipient.id);
        } else if (activeTab === 'groups' && selectedChannel) {
          await fetchChannelMessages(selectedChannel.id);
        }
        
        fetchConversations();
        fetchChannels();
      } else {
        const error = await response.json();
        alert('Failed to send message: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/messages/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          memberIds: selectedMembers,
          isPublic: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroupName('');
        setGroupDescription('');
        setSelectedMembers([]);
        setShowCreateGroupModal(false);
        await fetchChannels();
        setActiveTab('groups');
        setSelectedChannel(data.channel);
      } else {
        const error = await response.json();
        alert('Failed to create group: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachDocument = () => {
    fetchDocuments();
    setShowDocumentModal(true);
  };

  const handleOpenCreateGroup = () => {
    setGroupName('');
    setGroupDescription('');
    setSelectedMembers([]);
    setSearchQuery('');
    setShowCreateGroupModal(true);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleMemberSelection = (empId: string) => {
    setSelectedMembers(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const addEmoji = (emoji: string) => {
    setMessageContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handlePreviewDocument = (doc: Document) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleOpenSaveDocument = (doc: Document) => {
    setDocumentToSave(doc);
    setSaveToCompanyId(companies.length > 0 ? companies[0].id : '');
    setShowSaveDocumentModal(true);
  };

  const handleSaveDocument = async () => {
    if (!documentToSave || !saveToCompanyId) {
      alert('Please select a company');
      return;
    }

    try {
      const response = await fetch('/api/documents/save-from-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: documentToSave.id,
          targetCompanyId: saveToCompanyId,
        }),
      });

      if (response.ok) {
        alert('Document saved successfully!');
        setShowSaveDocumentModal(false);
        setDocumentToSave(null);
      } else {
        const error = await response.json();
        alert('Failed to save document: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save document');
    }
  };

  const handleOpenDeleteModal = (message: Message) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
  };

  const handleDeleteMessage = async (deleteForEveryone: boolean) => {
    if (!messageToDelete) return;

    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: messageToDelete.id,
          deleteForEveryone,
        }),
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setMessageToDelete(null);
        
        // Refresh messages
        if (activeTab === 'direct' && selectedRecipient) {
          await fetchMessages(selectedRecipient.id);
        } else if (activeTab === 'groups' && selectedChannel) {
          await fetchChannelMessages(selectedChannel.id);
        }
        
        fetchConversations();
      } else {
        const error = await response.json();
        alert('Failed to delete message: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const getAccessibleEmployees = () => {
    // Filter employees based on selected company and user role
    return employees.filter(emp => {
      // If admin, can message everyone
      if (session?.user?.role === 'ADMIN') {
        if (selectedCompany === 'all') return true;
        return emp.companyId === selectedCompany;
      }
      
      // Non-admins can only message people from their accessible companies
      const accessibleCompanyIds = companies.map(c => c.id);
      if (!emp.companyId || !accessibleCompanyIds.includes(emp.companyId)) {
        return false;
      }
      
      // Apply company filter
      if (selectedCompany === 'all') return true;
      return emp.companyId === selectedCompany;
    });
  };

  const filteredEmployees = getAccessibleEmployees().filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnreadCount = (recipientId: string) => {
    return conversations.filter(
      msg =>
        !msg.isRead &&
        msg.senderId === recipientId &&
        msg.recipientId === session?.user?.id
    ).length;
  };

  const isUserAdmin = (channel: Channel) => {
    return channel.members.some(m => m.employee.id === session?.user?.id && m.isAdmin);
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for comparison
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (messageDate.getTime() === todayDate.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterdayDate.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatMessageDate(message.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    
    return grouped;
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
            <p className="header-subtitle">
              {encryptionReady ? (
                <><FaLock className="security-icon" /> End-to-end encrypted • Secure messaging</>
              ) : (
                <><FaLock className="security-icon" /> Initializing encryption...</>
              )}
            </p>
          </div>
        </div>

        <div className="messages-container">
          {/* Sidebar - Conversations List */}
          <div className="conversations-sidebar">
            <div className="sidebar-header">
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'direct' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('direct');
                    setSelectedChannel(null);
                    setSearchQuery('');
                  }}
                >
                  <FaUser /> Direct
                </button>
                <button
                  className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('groups');
                    setSelectedRecipient(null);
                    setSearchQuery('');
                  }}
                >
                  <FaUsers /> Groups
                </button>
              </div>

              {activeTab === 'direct' ? (
                <>
                  {/* Company Filter (only for users with multi-company access) */}
                  {companies.length > 1 && (
                    <div className="company-filter">
                      <FaFilter className="filter-icon" />
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="company-select"
                      >
                        <option value="all">All Companies</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="search-bar">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search people..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <div className="filter-info">
                    <span>{filteredEmployees.length} contacts</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="search-bar">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <Button
                    variant="primary"
                    className="create-group-btn"
                    onClick={handleOpenCreateGroup}
                  >
                    <FaPlus /> Create Group
                  </Button>
                </>
              )}
            </div>

            <div className="conversations-list">
              {activeTab === 'direct' ? (
                filteredEmployees.map((employee) => {
                  const unreadCount = getUnreadCount(employee.id);
                  return (
                    <div
                      key={employee.id}
                      className={`conversation-item ${selectedRecipient?.id === employee.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedRecipient(employee);
                        setSelectedChannel(null);
                      }}
                    >
                      <div className="conversation-avatar">
                        {employee.profilePicture ? (
                          <img
                            src={`/api/employees/profile-picture/${employee.profilePicture}`}
                            alt={employee.name}
                          />
                        ) : (
                          <div className="avatar-initial">
                            {employee.name.charAt(0).toUpperCase()}
                          </div>
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
                })
              ) : (
                filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`conversation-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedChannel(channel);
                      setSelectedRecipient(null);
                    }}
                  >
                    <div className="conversation-avatar group">
                      <FaUsers className="avatar-icon" />
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">
                        {channel.name}
                        {isUserAdmin(channel) && <span className="admin-badge">Admin</span>}
                      </div>
                      <div className="conversation-email">
                        {channel.members.length} members
                        {channel.messages && channel.messages.length > 0 && (
                          <> • {channel.messages[0].sender.name}: {channel.messages[0].content.substring(0, 30)}...</>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {(selectedRecipient && activeTab === 'direct') || (selectedChannel && activeTab === 'groups') ? (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-recipient">
                    {activeTab === 'direct' && selectedRecipient ? (
                      <>
                        <div className="recipient-avatar">
                          {selectedRecipient.profilePicture ? (
                            <img
                              src={`/api/employees/profile-picture/${selectedRecipient.profilePicture}`}
                              alt={selectedRecipient.name}
                            />
                          ) : (
                            <div className="avatar-initial">
                              {selectedRecipient.name.charAt(0).toUpperCase()}
                            </div>
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
                      </>
                    ) : activeTab === 'groups' && selectedChannel ? (
                      <>
                        <div className="recipient-avatar group">
                          <FaUsers className="avatar-icon" />
                        </div>
                        <div>
                          <div className="recipient-name">{selectedChannel.name}</div>
                          <div className="recipient-status">
                            {selectedChannel.members.length} members
                          </div>
                        </div>
                        <button
                          className="group-info-btn"
                          onClick={() => setShowGroupInfoModal(true)}
                        >
                          <FaUsers />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Messages - iPhone/Telegram Style with Date Headers */}
                <div className="messages-list">
                  {Object.entries(groupMessagesByDate(messages)).map(([dateLabel, dateMessages]) => (
                    <div key={dateLabel}>
                      <div className="date-divider">
                        <span>{dateLabel}</span>
                      </div>
                      {dateMessages.map((message) => {
                        const isSent = message.senderId === session?.user?.id;
                        const isUnread = !message.isRead && !isSent;
                        return (
                          <div
                            key={message.id}
                            className={`message-wrapper ${isSent ? 'sent' : 'received'} ${isUnread ? 'unread' : ''}`}
                          >
                            {!isSent && activeTab === 'groups' && (
                              <div className="message-sender-name">{message.sender.name}</div>
                            )}
                            <div className="message-bubble-container">
                              {!isSent && (
                                <div className="message-avatar">
                                  {message.sender.profilePicture ? (
                                    <img
                                      src={`/api/employees/profile-picture/${message.sender.profilePicture}`}
                                      alt={message.sender.name}
                                    />
                                  ) : (
                                    <div className="avatar-initial-small">
                                      {message.sender.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className={`message-bubble ${isSent ? 'sent' : 'received'} ${isUnread ? 'unread' : ''}`}>
                                {isUnread && <div className="unread-indicator"></div>}
                                <div className="message-text">
                                  {message.isEncrypted && encryptionReady
                                    ? (decryptedMessages[message.id] || '🔐 Decrypting...')
                                    : message.content}
                                </div>
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="message-attachments">
                                    {message.attachments.map((att) => (
                                      <div key={att.id} className="attachment-item">
                                        <div className="attachment-info">
                                          {att.document.mimeType?.includes('pdf') ? (
                                            <FaFilePdf className="file-icon pdf" />
                                          ) : (
                                            <FaFile className="file-icon" />
                                          )}
                                          <span className="attachment-name">{att.document.name}</span>
                                          <span className="attachment-size">
                                            ({(att.document.size / 1024).toFixed(1)} KB)
                                          </span>
                                        </div>
                                        <div className="attachment-actions">
                                          {att.document.mimeType?.includes('pdf') && (
                                            <button
                                              className="attachment-btn preview-btn"
                                              onClick={() => handlePreviewDocument(att.document)}
                                              title="Quick View"
                                            >
                                              <FaEye />
                                            </button>
                                          )}
                                          <button
                                            className="attachment-btn download-btn"
                                            onClick={() => handleDownloadDocument(att.document)}
                                            title="Download"
                                          >
                                            <FaDownload />
                                          </button>
                                          {!isSent && (
                                            <button
                                              className="attachment-btn save-btn"
                                              onClick={() => handleOpenSaveDocument(att.document)}
                                              title="Save to Documents"
                                            >
                                              <FaSave />
                                            </button>
                                          )}
                                        </div>
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
                                  {((message as any).disappearAfter || (message as any).expiresAt) && (
                                    <span className="expires-indicator" title={
                                      (message as any).expiresAt 
                                        ? "Timer started - message will self-destruct" 
                                        : "Timer starts when recipient reads this message"
                                    }>
                                      <FaClock /> 🔥
                                    </span>
                                  )}
                                  {isSent ? (
                                    <span className="read-status">
                                      {message.isRead ? (
                                        <FaCheckDouble className="read" title="Read" />
                                      ) : (
                                        <FaCheck className="sent" title="Delivered" />
                                      )}
                                    </span>
                                  ) : isUnread ? (
                                    <span className="unread-status-text">New</span>
                                  ) : null}
                                  <button
                                    className="delete-message-btn"
                                    onClick={() => handleOpenDeleteModal(message)}
                                    title="Delete message"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="no-messages">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
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
                  <div className="disappearing-message-controls">
                    <FaClock className="timer-icon" />
                    <select
                      value={disappearAfter}
                      onChange={(e) => setDisappearAfter(Number(e.target.value))}
                      className="timer-select"
                    >
                      <option value={0}>No timer</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={3600}>1 hour</option>
                      <option value={86400}>24 hours</option>
                      <option value={604800}>7 days</option>
                    </select>
                    {disappearAfter > 0 && (
                      <span className="timer-badge">
                        🔥 Self-destruct
                      </span>
                    )}
                  </div>
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
                <p>
                  {activeTab === 'direct' 
                    ? 'Choose a team member from the list to start messaging'
                    : 'Select a group or create a new one to start chatting'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Attachment Modal - Custom Styled */}
        {showDocumentModal && (
          <div className="custom-modal-overlay" onClick={() => setShowDocumentModal(false)}>
            <div className="custom-modal document-modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <h2>
                  <FaPaperclip /> Attach Documents
                </h2>
                <button className="close-btn" onClick={() => setShowDocumentModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="custom-modal-body documents-modal-body">
                {isLoadingDocuments ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading documents from your companies...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="empty-state">
                    <FaFile className="empty-icon" />
                    <p>No documents available</p>
                    <small>Upload documents to your companies first</small>
                  </div>
                ) : (
                  <>
                    <div className="document-search-bar">
                      <FaSearch className="search-icon-doc" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={documentSearchQuery}
                        onChange={(e) => setDocumentSearchQuery(e.target.value)}
                        className="doc-search-input"
                      />
                      {documentSearchQuery && (
                        <button
                          className="clear-search-btn"
                          onClick={() => setDocumentSearchQuery('')}
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                    <div className="documents-header">
                      <span className="doc-count">
                        {documents.filter(doc => doc.name.toLowerCase().includes(documentSearchQuery.toLowerCase())).length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
                      </span>
                      {selectedDocuments.length > 0 && (
                        <span className="selected-count">
                          {selectedDocuments.length} selected
                        </span>
                      )}
                    </div>
                    <div className="documents-list-scrollable">
                      <div className="documents-grid-large">
                        {documents
                          .filter(doc => doc.name.toLowerCase().includes(documentSearchQuery.toLowerCase()))
                          .map((doc) => {
                          const isSelected = selectedDocuments.includes(doc.id);
                          const isPdf = doc.mimeType?.includes('pdf');
                          
                          return (
                            <div
                              key={doc.id}
                              className={`document-card-large ${isSelected ? 'selected' : ''}`}
                            >
                              <div className="doc-card-header">
                                <div className="doc-icon-wrapper-large">
                                  {isPdf ? (
                                    <FaFilePdf className="doc-icon-large pdf" />
                                  ) : (
                                    <FaFile className="doc-icon-large" />
                                  )}
                                </div>
                                <div className="doc-info-large">
                                  <div className="doc-name-large" title={doc.name}>{doc.name}</div>
                                  <div className="doc-meta">
                                    <span className="doc-size-large">
                                      {(doc.size / 1024).toFixed(1)} KB
                                    </span>
                                    {doc.mimeType && (
                                      <span className="doc-type">
                                        {doc.mimeType.split('/')[1]?.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="doc-card-actions">
                                {isPdf && (
                                  <button
                                    className="doc-action-btn preview"
                                    onClick={() => handlePreviewDocument(doc)}
                                    title="Quick View"
                                  >
                                    <FaEye /> Preview
                                  </button>
                                )}
                                <button
                                  className={`doc-action-btn select ${isSelected ? 'selected' : ''}`}
                                  onClick={() => toggleDocumentSelection(doc.id)}
                                >
                                  {isSelected ? (
                                    <>
                                      <FaCheck /> Selected
                                    </>
                                  ) : (
                                    <>
                                      <FaPlus /> Select
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="custom-modal-footer">
                <button className="btn-secondary" onClick={() => setShowDocumentModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => setShowDocumentModal(false)}
                  disabled={selectedDocuments.length === 0}
                >
                  <FaPaperclip /> Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Modal - Custom Styled */}
        {showCreateGroupModal && (
          <div className="custom-modal-overlay" onClick={() => setShowCreateGroupModal(false)}>
            <div className="custom-modal large" onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <h2>
                  <FaUsers /> Create Group Chat
                </h2>
                <button className="close-btn" onClick={() => setShowCreateGroupModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="custom-modal-body">
                <div className="form-section">
                  <label className="form-label">
                    Group Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter group name (e.g., Project Team, Sales Department)"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="What's this group about?"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">
                    Select Members <span className="required">*</span>
                    {selectedMembers.length > 0 && (
                      <span className="member-count">{selectedMembers.length} selected</span>
                    )}
                  </label>
                  <div className="search-members">
                    <FaSearch className="search-icon-small" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input-small"
                    />
                  </div>
                  <div className="members-grid-custom">
                    {getAccessibleEmployees()
                      .filter(emp => 
                        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((employee) => (
                        <div
                          key={employee.id}
                          className={`member-card ${selectedMembers.includes(employee.id) ? 'selected' : ''}`}
                          onClick={() => toggleMemberSelection(employee.id)}
                        >
                          <div className="member-avatar-wrapper">
                            {employee.profilePicture ? (
                              <img
                                src={`/api/employees/profile-picture/${employee.profilePicture}`}
                                alt={employee.name}
                                className="member-avatar-img"
                              />
                            ) : (
                              <div className="member-avatar-placeholder">
                                <FaUser />
                              </div>
                            )}
                            {employee.isActive && <span className="online-dot"></span>}
                          </div>
                          <div className="member-info">
                            <div className="member-name-text">{employee.name}</div>
                            <div className="member-email-text">{employee.email}</div>
                          </div>
                          {selectedMembers.includes(employee.id) && (
                            <div className="selected-indicator">
                              <FaCheck />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button className="btn-secondary" onClick={() => setShowCreateGroupModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateGroup}
                  disabled={isLoading || !groupName.trim() || selectedMembers.length === 0}
                >
                  <FaUserPlus /> Create Group
                  {selectedMembers.length > 0 && ` • ${selectedMembers.length} members`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Info Modal - Custom Styled */}
        {showGroupInfoModal && selectedChannel && (
          <div className="custom-modal-overlay" onClick={() => setShowGroupInfoModal(false)}>
            <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <h2>
                  <FaUsers /> {selectedChannel.name}
                </h2>
                <button className="close-btn" onClick={() => setShowGroupInfoModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="custom-modal-body">
                {selectedChannel.description && (
                  <div className="group-description-section">
                    <h4>Description</h4>
                    <p>{selectedChannel.description}</p>
                  </div>
                )}
                <div className="group-members-section">
                  <h4>Members ({selectedChannel.members.length})</h4>
                  <div className="members-list-custom">
                    {selectedChannel.members.map((member) => (
                      <div key={member.id} className="member-info-card">
                        <div className="member-avatar-wrapper">
                          {member.employee.profilePicture ? (
                            <img
                              src={`/api/employees/profile-picture/${member.employee.profilePicture}`}
                              alt={member.employee.name}
                              className="member-avatar-img"
                            />
                          ) : (
                            <div className="member-avatar-placeholder">
                              <FaUser />
                            </div>
                          )}
                          {member.employee.isActive && <span className="online-dot"></span>}
                        </div>
                        <div className="member-details-full">
                          <div className="member-name-text">
                            {member.employee.name}
                            {member.isAdmin && <span className="admin-tag">Admin</span>}
                          </div>
                          <div className="member-email-text">{member.employee.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button className="btn-primary" onClick={() => setShowGroupInfoModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {showPreviewModal && previewDocument && (
          <div className="custom-modal-overlay" onClick={() => setShowPreviewModal(false)}>
            <div className="custom-modal preview-modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <h2>
                  <FaFilePdf /> {previewDocument.name}
                </h2>
                <button className="close-btn" onClick={() => setShowPreviewModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="custom-modal-body preview-body">
                {previewDocument.mimeType?.includes('pdf') ? (
                  <iframe
                    src={`/api/documents/${previewDocument.id}/download`}
                    className="pdf-preview-iframe"
                    title={previewDocument.name}
                  />
                ) : (
                  <div className="empty-state">
                    <FaFile className="empty-icon" />
                    <p>Preview not available for this file type</p>
                  </div>
                )}
              </div>
              <div className="custom-modal-footer">
                <button className="btn-secondary" onClick={() => setShowPreviewModal(false)}>
                  Close
                </button>
                <button className="btn-primary" onClick={() => handleDownloadDocument(previewDocument)}>
                  <FaDownload /> Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Document Modal */}
        {showSaveDocumentModal && documentToSave && (
          <div className="custom-modal-overlay" onClick={() => setShowSaveDocumentModal(false)}>
            <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <h2>
                  <FaSave /> Save to Documents
                </h2>
                <button className="close-btn" onClick={() => setShowSaveDocumentModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="custom-modal-body">
                <div className="save-document-info">
                  <div className="doc-preview-card">
                    {documentToSave.mimeType?.includes('pdf') ? (
                      <FaFilePdf className="doc-preview-icon pdf" />
                    ) : (
                      <FaFile className="doc-preview-icon" />
                    )}
                    <div className="doc-preview-details">
                      <div className="doc-preview-name">{documentToSave.name}</div>
                      <div className="doc-preview-size">
                        {(documentToSave.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group-custom">
                    <label htmlFor="saveToCompany">Save to Company:</label>
                    <select
                      id="saveToCompany"
                      className="form-input"
                      value={saveToCompanyId}
                      onChange={(e) => setSaveToCompanyId(e.target.value)}
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="save-info-text">
                    <small>This document will be added to the selected company's document library.</small>
                  </div>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button className="btn-secondary" onClick={() => setShowSaveDocumentModal(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveDocument}>
                  <FaSave /> Save Document
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Message Modal */}
        {showDeleteModal && messageToDelete && (
          <div className="custom-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <h2>
                  <FaTrash /> Delete Message
                </h2>
                <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="custom-modal-body">
                <div className="delete-message-info">
                  <div className="warning-icon-wrapper">
                    <FaTrash className="warning-icon" />
                  </div>
                  <h3>Are you sure you want to delete this message?</h3>
                  <p className="delete-message-text">
                    {messageToDelete.content?.substring(0, 100)}
                    {messageToDelete.content && messageToDelete.content.length > 100 ? '...' : ''}
                  </p>
                  <div className="delete-options-info">
                    <div className="delete-option-card">
                      <h4>🗑️ Delete for me</h4>
                      <p>Remove this message from your device only. Others can still see it.</p>
                    </div>
                    <div className="delete-option-card danger">
                      <h4>⚠️ Delete for everyone</h4>
                      <p>
                        Permanently delete this message for all participants. 
                        {messageToDelete.senderId !== session?.user?.id && (
                          <span className="warning-text"> You did not send this message.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-warning"
                  onClick={() => handleDeleteMessage(false)}
                >
                  <FaTrash /> Delete for Me
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteMessage(true)}
                >
                  <FaTrash /> Delete for Everyone
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .messages-page {
            padding: 1rem;
            height: calc(100vh - 80px);
            display: flex;
            flex-direction: column;
            background: #0e0e0e;
          }

          .page-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1.5rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
            border: 1px solid rgba(102, 126, 234, 0.25);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .security-icon {
            color: #28a745;
          }

          .messages-container {
            display: flex;
            gap: 0;
            flex: 1;
            min-height: 0;
            background: #17212b;
            border: 1px solid rgba(102, 126, 234, 0.15);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          }

          .conversations-sidebar {
            width: 340px;
            border-right: 1px solid #0e1621;
            display: flex;
            flex-direction: column;
            background: #17212b;
          }

          .sidebar-header {
            padding: 1rem;
            border-bottom: 1px solid #0e1621;
            background: #0e1621;
          }

          .tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .tab {
            flex: 1;
            padding: 0.75rem;
            background: transparent;
            border: none;
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            font-weight: 500;
          }

          .tab:hover {
            background: rgba(102, 126, 234, 0.1);
            color: rgba(255, 255, 255, 0.8);
          }

          .tab.active {
            background: rgba(102, 126, 234, 0.15);
            color: #ffffff;
            border-bottom: 2px solid #667eea;
          }

          .company-filter {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #0f1419;
            border: 1px solid #0e1621;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.75rem;
          }

          .filter-icon {
            color: #ffffff;
            font-size: 0.9rem;
          }

          .company-select {
            background: transparent;
            border: none;
            color: white;
            font-size: 0.9rem;
            outline: none;
            width: 100%;
            cursor: pointer;
          }

          .company-select option {
            background: #1a1a2e;
            color: white;
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
            background: #0f1419;
            border: 1px solid #0e1621;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.75rem;
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

          .create-group-btn {
            width: 100%;
            margin-top: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
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
            border-bottom: 1px solid #0e1621;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .conversation-item:hover {
            background: #0e1621;
          }

          .conversation-item.active {
            background: #0e1621;
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

          .conversation-avatar.group {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
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

          .avatar-initial {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: 700;
            text-transform: uppercase;
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
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .admin-badge {
            font-size: 0.7rem;
            padding: 0.15rem 0.4rem;
            background: #667eea;
            border-radius: 4px;
            font-weight: 500;
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
            border-bottom: 1px solid #0e1621;
            background: #0e1621;
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

          .recipient-avatar.group {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
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

          .group-info-btn {
            margin-left: auto;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            padding: 0.5rem 1rem;
            color: #ffffff;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .group-info-btn:hover {
            background: rgba(102, 126, 234, 0.3);
          }

          .messages-list {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background: #0f1419;
          }

          .date-divider {
            text-align: center;
            margin: 1rem 0;
            position: relative;
          }

          .date-divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            z-index: 0;
          }

          .date-divider span {
            position: relative;
            z-index: 1;
            background: #17212b;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.6);
            border: 1px solid #0e1621;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .no-messages {
            text-align: center;
            padding: 3rem 1rem;
            color: rgba(255, 255, 255, 0.5);
          }

          /* iPhone/Telegram Style Chat Bubbles */
          .message-wrapper {
            display: flex;
            flex-direction: column;
            margin-bottom: 0.5rem;
          }

          .message-wrapper.sent {
            align-items: flex-end;
          }

          .message-wrapper.received {
            align-items: flex-start;
          }

          .message-sender-name {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 0.25rem;
            margin-left: 48px;
            font-weight: 500;
          }

          .message-bubble-container {
            display: flex;
            gap: 0.5rem;
            max-width: 70%;
            animation: slideIn 0.3s ease;
          }

          .message-wrapper.sent .message-bubble-container {
            flex-direction: row-reverse;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            align-self: flex-end;
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

          .avatar-initial-small {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            font-size: 0.9rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          .message-bubble {
            padding: 0.75rem 1rem;
            border-radius: 18px;
            word-wrap: break-word;
            position: relative;
          }

          /* Sent messages - Solid color (like Telegram) */
          .message-bubble.sent {
            background: #667eea;
            border-bottom-right-radius: 4px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          /* Received messages - Dark gray (like Telegram dark mode) */
          .message-bubble.received {
            background: #1c2733;
            border-bottom-left-radius: 4px;
            border: none;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          /* Unread messages - Highlighted */
          .message-bubble.received.unread {
            background: rgba(102, 126, 234, 0.25);
            border: 2px solid rgba(102, 126, 234, 0.5);
            box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
            animation: pulseUnread 2s ease-in-out infinite;
          }

          @keyframes pulseUnread {
            0%, 100% {
              box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
            }
            50% {
              box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
            }
          }

          .unread-indicator {
            position: absolute;
            top: -4px;
            left: -4px;
            width: 12px;
            height: 12px;
            background: #dc3545;
            border-radius: 50%;
            border: 2px solid rgba(20, 20, 40, 0.9);
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.8;
            }
          }

          .unread-status-text {
            background: #dc3545;
            color: #ffffff;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
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
            gap: 0.5rem;
          }

          .attachment-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.75rem;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 10px;
            font-size: 0.85rem;
            color: #ffffff;
            transition: all 0.2s ease;
          }

          .attachment-item:hover {
            background: rgba(0, 0, 0, 0.4);
            border-color: rgba(102, 126, 234, 0.4);
          }

          .attachment-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;
          }

          .file-icon {
            color: #667eea;
            font-size: 1.2rem;
            flex-shrink: 0;
          }

          .file-icon.pdf {
            color: #dc3545;
          }

          .attachment-name {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .attachment-size {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.75rem;
            flex-shrink: 0;
          }

          .attachment-actions {
            display: flex;
            gap: 0.5rem;
            flex-shrink: 0;
          }

          .attachment-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: rgba(102, 126, 234, 0.15);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 6px;
            color: #667eea;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
          }

          .attachment-btn:hover {
            background: rgba(102, 126, 234, 0.25);
            border-color: rgba(102, 126, 234, 0.5);
            transform: translateY(-1px);
          }

          .attachment-btn.preview-btn {
            color: #17a2b8;
            background: rgba(23, 162, 184, 0.15);
            border-color: rgba(23, 162, 184, 0.3);
          }

          .attachment-btn.preview-btn:hover {
            background: rgba(23, 162, 184, 0.25);
            border-color: rgba(23, 162, 184, 0.5);
          }

          .attachment-btn.download-btn {
            color: #28a745;
            background: rgba(40, 167, 69, 0.15);
            border-color: rgba(40, 167, 69, 0.3);
          }

          .attachment-btn.download-btn:hover {
            background: rgba(40, 167, 69, 0.25);
            border-color: rgba(40, 167, 69, 0.5);
          }

          .attachment-btn.save-btn {
            color: #ffc107;
            background: rgba(255, 193, 7, 0.15);
            border-color: rgba(255, 193, 7, 0.3);
          }

          .attachment-btn.save-btn:hover {
            background: rgba(255, 193, 7, 0.25);
            border-color: rgba(255, 193, 7, 0.5);
          }

          .message-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.25rem;
            justify-content: flex-end;
          }

          .message-time {
            font-size: 0.7rem;
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
            border-top: 1px solid #0e1621;
            background: #17212b;
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
            background: #0e1621;
            border: 1px solid #0e1621;
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

          .members-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
            max-height: 400px;
            overflow-y: auto;
          }

          .member-item {
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

          .member-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #667eea;
          }

          .member-item.selected {
            background: rgba(102, 126, 234, 0.2);
            border-color: #667eea;
          }

          .member-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #667eea;
          }

          .member-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .member-name {
            color: #ffffff;
            font-size: 0.85rem;
            word-wrap: break-word;
            max-width: 100%;
          }

          .members-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1rem;
            max-height: 400px;
            overflow-y: auto;
          }

          .member-item-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
          }

          .member-details {
            flex: 1;
          }

          .member-email {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
          }

          .online-indicator-small {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 10px;
            height: 10px;
            background: #28a745;
            border: 2px solid #000;
            border-radius: 50%;
          }

          .group-description {
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
          }

          .group-description p {
            color: rgba(255, 255, 255, 0.8);
            margin: 0.5rem 0 0 0;
          }

          /* Custom Modal Styles */
          .custom-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 1rem;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .custom-modal {
            background: #17212b;
            border: 1px solid #0e1621;
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
            animation: slideUp 0.3s ease;
          }

          .custom-modal.large {
            max-width: 800px;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .custom-modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #0e1621;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #0e1621;
            border-radius: 20px 20px 0 0;
          }

          .custom-modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1.2rem;
          }

          .close-btn:hover {
            background: rgba(220, 53, 69, 0.2);
            border-color: #dc3545;
            color: #dc3545;
            transform: rotate(90deg);
          }

          .custom-modal-body {
            padding: 1.5rem;
            overflow-y: auto;
            flex: 1;
          }

          .custom-modal-footer {
            padding: 1.5rem;
            border-top: 1px solid #0e1621;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 1rem;
            background: #0e1621;
            border-radius: 0 0 20px 20px;
          }

          .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }

          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
          }

          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
          }

          /* Document Grid */
          .documents-grid-custom {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            max-height: 500px;
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .document-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #0e1621;
            border: 2px solid #0e1621;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          }

          .document-card:hover {
            background: #17212b;
            border-color: rgba(102, 126, 234, 0.5);
            transform: translateY(-2px);
          }

          .document-card.selected {
            background: rgba(102, 126, 234, 0.2);
            border-color: #667eea;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }

          .doc-icon-wrapper {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .doc-icon-wrapper .doc-icon {
            color: #ffffff;
            font-size: 1.5rem;
          }

          .doc-info {
            flex: 1;
            min-width: 0;
          }

          .doc-name {
            color: #ffffff;
            font-weight: 600;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 0.25rem;
          }

          .doc-size {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
          }

          .selected-indicator {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            width: 28px;
            height: 28px;
            background: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 0.9rem;
            animation: popIn 0.3s ease;
          }

          @keyframes popIn {
            0% {
              transform: scale(0);
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
            }
          }

          /* Large Document Modal Styles */
          .document-modal-large {
            max-width: 900px;
            max-height: 85vh;
          }

          .documents-modal-body {
            padding: 1.5rem;
            max-height: 60vh;
            overflow: hidden;
          }

          .documents-list-scrollable {
            max-height: calc(60vh - 4rem);
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .documents-grid-large {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .document-card-large {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 1.25rem;
            background: #0e1621;
            border: 2px solid #0e1621;
            border-radius: 12px;
            transition: all 0.3s ease;
          }

          .document-card-large:hover {
            background: #17212b;
            border-color: rgba(102, 126, 234, 0.3);
          }

          .document-card-large.selected {
            background: rgba(102, 126, 234, 0.15);
            border-color: #667eea;
          }

          .doc-card-header {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .doc-icon-wrapper-large {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .doc-icon-large {
            color: #ffffff;
            font-size: 1.75rem;
          }

          .doc-icon-large.pdf {
            color: #ffffff;
          }

          .doc-info-large {
            flex: 1;
            min-width: 0;
          }

          .doc-name-large {
            color: #ffffff;
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.5rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .doc-meta {
            display: flex;
            gap: 1rem;
            align-items: center;
          }

          .doc-size-large {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.85rem;
          }

          .doc-type {
            padding: 0.25rem 0.6rem;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #667eea;
          }

          .doc-card-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 0.5rem;
          }

          .doc-action-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.65rem 1.25rem;
            background: rgba(102, 126, 234, 0.15);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            color: #667eea;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .doc-action-btn:hover {
            background: rgba(102, 126, 234, 0.25);
            border-color: rgba(102, 126, 234, 0.5);
            transform: translateY(-1px);
          }

          .doc-action-btn.preview {
            color: #17a2b8;
            background: rgba(23, 162, 184, 0.15);
            border-color: rgba(23, 162, 184, 0.3);
          }

          .doc-action-btn.preview:hover {
            background: rgba(23, 162, 184, 0.25);
            border-color: rgba(23, 162, 184, 0.5);
          }

          .doc-action-btn.select.selected {
            background: rgba(40, 167, 69, 0.2);
            border-color: rgba(40, 167, 69, 0.5);
            color: #28a745;
          }

          .selected-count {
            padding: 0.4rem 0.9rem;
            background: rgba(40, 167, 69, 0.2);
            border: 1px solid rgba(40, 167, 69, 0.4);
            border-radius: 8px;
            color: #28a745;
            font-weight: 600;
            font-size: 0.85rem;
          }

          /* PDF Preview Modal */
          .preview-modal-large {
            max-width: 95vw;
            max-height: 95vh;
            width: 1200px;
          }

          .preview-body {
            padding: 0;
            max-height: calc(95vh - 140px);
            overflow: hidden;
          }

          .pdf-preview-iframe {
            width: 100%;
            height: calc(95vh - 140px);
            border: none;
            background: #1a1a1a;
          }

          /* Save Document Modal */
          .save-document-info {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .doc-preview-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.25rem;
            background: #0e1621;
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 12px;
          }

          .doc-preview-icon {
            font-size: 2.5rem;
            color: #667eea;
          }

          .doc-preview-icon.pdf {
            color: #dc3545;
          }

          .doc-preview-details {
            flex: 1;
          }

          .doc-preview-name {
            color: #ffffff;
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          .doc-preview-size {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.85rem;
          }

          .form-group-custom {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .form-group-custom label {
            color: #ffffff;
            font-weight: 600;
            font-size: 0.95rem;
          }

          .save-info-text {
            padding: 1rem;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 8px;
          }

          .save-info-text small {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
          }

          /* Delete Message Modal */
          .delete-message-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            text-align: center;
          }

          .warning-icon-wrapper {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(220, 53, 69, 0.15);
            border: 3px solid rgba(220, 53, 69, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .warning-icon {
            font-size: 2.5rem;
            color: #dc3545;
          }

          .delete-message-text {
            padding: 1rem;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            font-style: italic;
            color: rgba(255, 255, 255, 0.8);
            max-width: 400px;
            word-break: break-word;
          }

          .delete-options-info {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            width: 100%;
          }

          .delete-option-card {
            padding: 1.25rem;
            background: rgba(40, 167, 69, 0.1);
            border: 1px solid rgba(40, 167, 69, 0.3);
            border-radius: 10px;
            text-align: left;
          }

          .delete-option-card.danger {
            background: rgba(220, 53, 69, 0.1);
            border-color: rgba(220, 53, 69, 0.3);
          }

          .delete-option-card h4 {
            color: #ffffff;
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          .delete-option-card p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
            margin: 0;
          }

          .warning-text {
            color: #ffc107;
            font-weight: 600;
          }

          .btn-warning {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
            border: none;
            border-radius: 8px;
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .btn-warning:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
          }

          .btn-danger {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            border: none;
            border-radius: 8px;
            color: #ffffff;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
          }

          /* Disappearing Message Controls */
          .disappearing-message-controls {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 10px;
            margin-bottom: 0.75rem;
          }

          .timer-icon {
            color: #667eea;
            font-size: 1.1rem;
          }

          .timer-select {
            flex: 1;
            padding: 0.5rem 0.75rem;
            background: #0e1621;
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 6px;
            color: #ffffff;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .timer-select:hover {
            border-color: rgba(102, 126, 234, 0.5);
          }

          .timer-select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .timer-badge {
            padding: 0.4rem 0.8rem;
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            border-radius: 6px;
            color: #ffffff;
            font-weight: 600;
            font-size: 0.8rem;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }

          /* Delete Message Button */
          .delete-message-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: rgba(220, 53, 69, 0.15);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 4px;
            color: #dc3545;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.75rem;
            opacity: 0.7;
          }

          .delete-message-btn:hover {
            background: rgba(220, 53, 69, 0.25);
            border-color: rgba(220, 53, 69, 0.5);
            opacity: 1;
            transform: scale(1.1);
          }

          .expires-indicator {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.7rem;
            color: #ff6b6b;
            animation: pulse 2s infinite;
          }

          /* Document Search Bar */
          .document-search-bar {
            position: relative;
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0 1rem;
          }

          .search-icon-doc {
            position: absolute;
            left: 2rem;
            color: rgba(255, 255, 255, 0.5);
            font-size: 1rem;
          }

          .doc-search-input {
            flex: 1;
            padding: 0.75rem 1rem 0.75rem 3rem;
            background: #0e1621;
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-radius: 10px;
            color: #ffffff;
            font-size: 0.95rem;
            transition: all 0.2s ease;
          }

          .doc-search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          }

          .doc-search-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }

          .clear-search-btn {
            position: absolute;
            right: 2rem;
            width: 28px;
            height: 28px;
            background: rgba(220, 53, 69, 0.15);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 50%;
            color: #dc3545;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .clear-search-btn:hover {
            background: rgba(220, 53, 69, 0.25);
            border-color: rgba(220, 53, 69, 0.5);
            transform: rotate(90deg);
          }

          .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: rgba(255, 255, 255, 0.6);
          }

          .empty-state .empty-icon {
            font-size: 3rem;
            color: rgba(102, 126, 234, 0.4);
            margin-bottom: 1rem;
          }

          .empty-state small {
            display: block;
            margin-top: 0.5rem;
            color: rgba(255, 255, 255, 0.4);
            font-size: 0.85rem;
          }

          .loading-state {
            text-align: center;
            padding: 3rem 1rem;
            color: rgba(255, 255, 255, 0.7);
          }

          .loading-state p {
            margin-top: 1rem;
            font-size: 0.95rem;
          }

          .spinner {
            width: 50px;
            height: 50px;
            margin: 0 auto;
            border: 4px solid rgba(102, 126, 234, 0.2);
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .documents-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .doc-count {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            font-weight: 600;
          }

          /* Form Sections */
          .form-section {
            margin-bottom: 1.5rem;
          }

          .form-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #ffffff;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.75rem;
          }

          .required {
            color: #dc3545;
            margin-left: 0.25rem;
          }

          .member-count {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            font-size: 0.85rem;
          }

          .form-input, .form-textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #0f1419;
            border: 1px solid #0e1621;
            border-radius: 10px;
            color: #ffffff;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.3s ease;
          }

          .form-input:focus, .form-textarea:focus {
            background: #0e1621;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
          }

          .form-input::placeholder, .form-textarea::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .form-textarea {
            resize: vertical;
            min-height: 60px;
          }

          .search-members {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: #0f1419;
            border: 1px solid #0e1621;
            border-radius: 10px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
          }

          .search-icon-small {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1rem;
          }

          .search-input-small {
            flex: 1;
            background: transparent;
            border: none;
            color: #ffffff;
            font-size: 0.95rem;
            outline: none;
          }

          .search-input-small::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          /* Members Grid */
          .members-grid-custom {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-height: 350px;
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .member-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #0e1621;
            border: 2px solid #0e1621;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          }

          .member-card:hover {
            background: #17212b;
            border-color: rgba(102, 126, 234, 0.5);
            transform: translateX(4px);
          }

          .member-card.selected {
            background: rgba(102, 126, 234, 0.2);
            border-color: #667eea;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }

          .member-avatar-wrapper {
            position: relative;
            width: 50px;
            height: 50px;
            flex-shrink: 0;
          }

          .member-avatar-img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #667eea;
          }

          .member-avatar-placeholder {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 1.2rem;
            border: 2px solid #667eea;
          }

          .online-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: #28a745;
            border: 2px solid rgba(20, 20, 40, 0.98);
            border-radius: 50%;
          }

          .member-info {
            flex: 1;
            min-width: 0;
          }

          .member-name-text {
            color: #ffffff;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.25rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .member-email-text {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.85rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Group Info Styles */
          .group-description-section, .group-members-section {
            margin-bottom: 1.5rem;
          }

          .group-description-section h4, .group-members-section h4 {
            color: #ffffff;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
          }

          .group-description-section p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.95rem;
            line-height: 1.6;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .members-list-custom {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-height: 400px;
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .member-info-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #0e1621;
            border: 1px solid #0e1621;
            border-radius: 12px;
            transition: all 0.3s ease;
          }

          .member-info-card:hover {
            background: #17212b;
            border-color: rgba(102, 126, 234, 0.3);
          }

          .member-details-full {
            flex: 1;
            min-width: 0;
          }

          .admin-tag {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-left: 0.5rem;
          }

          /* Scrollbar Styles */
          .documents-grid-custom::-webkit-scrollbar,
          .members-grid-custom::-webkit-scrollbar,
          .members-list-custom::-webkit-scrollbar,
          .custom-modal-body::-webkit-scrollbar {
            width: 8px;
          }

          .documents-grid-custom::-webkit-scrollbar-track,
          .members-grid-custom::-webkit-scrollbar-track,
          .members-list-custom::-webkit-scrollbar-track,
          .custom-modal-body::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }

          .documents-grid-custom::-webkit-scrollbar-thumb,
          .members-grid-custom::-webkit-scrollbar-thumb,
          .members-list-custom::-webkit-scrollbar-thumb,
          .custom-modal-body::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.5);
            border-radius: 4px;
          }

          .documents-grid-custom::-webkit-scrollbar-thumb:hover,
          .members-grid-custom::-webkit-scrollbar-thumb:hover,
          .members-list-custom::-webkit-scrollbar-thumb:hover,
          .custom-modal-body::-webkit-scrollbar-thumb:hover {
            background: rgba(102, 126, 234, 0.7);
          }

          @media (max-width: 1023px) {
            .messages-page {
              padding: 0;
              height: calc(100vh - 60px);
            }

            .page-header {
              padding: 0.75rem 1rem;
              margin-bottom: 0.5rem;
              gap: 0.75rem;
            }

            .header-icon {
              width: 40px;
              height: 40px;
              font-size: 1rem;
            }

            .header-text h1 {
              font-size: 1.25rem;
            }

            .header-subtitle {
              font-size: 0.75rem;
            }

            .messages-container {
              flex-direction: column;
              height: 100%;
              border-radius: 0;
            }

            .conversations-sidebar {
              width: 100%;
              max-height: 35vh;
              border-right: none;
              border-bottom: 2px solid #0e1621;
              overflow-y: auto;
            }

            .sidebar-header {
              padding: 0.75rem;
            }

            .tabs {
              font-size: 0.8rem;
              gap: 0.25rem;
            }

            .tab {
              padding: 0.5rem;
            }

            .search-bar, .company-filter {
              padding: 0.4rem 0.6rem;
              font-size: 0.85rem;
            }

            .conversation-item {
              padding: 0.75rem;
            }

            .conversation-avatar {
              width: 40px;
              height: 40px;
            }

            .conversation-name {
              font-size: 0.9rem;
            }

            .conversation-email {
              font-size: 0.75rem;
            }

            .chat-area {
              height: 65vh;
              min-height: 0;
            }

            .chat-header {
              padding: 0.75rem 1rem;
            }

            .recipient-avatar {
              width: 35px;
              height: 35px;
            }

            .recipient-name {
              font-size: 0.9rem;
            }

            .recipient-status {
              font-size: 0.75rem;
            }

            .messages-list {
              padding: 1rem;
              gap: 0.75rem;
            }

            .message-bubble-container {
              max-width: 90%;
            }

            .message-bubble {
              padding: 0.65rem 0.85rem;
              font-size: 0.9rem;
            }

            .message-text {
              font-size: 0.9rem;
            }

            .message-time {
              font-size: 0.65rem;
            }

            .message-avatar {
              width: 28px;
              height: 28px;
            }

            .date-divider span {
              font-size: 0.75rem;
              padding: 0.4rem 0.75rem;
            }

            .message-input-container {
              padding: 0.75rem 1rem;
            }

            .input-wrapper {
              padding: 0.4rem 0.75rem;
            }

            .message-input {
              font-size: 0.9rem;
            }

            .attach-btn, .send-btn, .emoji-btn {
              font-size: 1rem;
              padding: 0.4rem;
            }

            .emoji-picker {
              left: 0;
              right: auto;
              grid-template-columns: repeat(4, 1fr);
            }

            .custom-modal {
              max-width: 95%;
              max-height: 90vh;
              margin: 1rem;
            }

            .custom-modal-header {
              padding: 1rem;
            }

            .custom-modal-header h2 {
              font-size: 1.1rem;
            }

            .custom-modal-body {
              padding: 1rem;
            }

            .custom-modal-footer {
              padding: 1rem;
            }

            .documents-grid-custom {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }

            .document-card {
              padding: 0.75rem;
            }

            .doc-icon-wrapper {
              width: 40px;
              height: 40px;
            }

            .doc-name {
              font-size: 0.8rem;
            }

            .members-grid-custom {
              max-height: 200px;
            }

            .member-card {
              padding: 0.75rem;
            }

            .form-input, .form-textarea {
              font-size: 0.9rem;
              padding: 0.65rem 0.85rem;
            }

            .btn-primary, .btn-secondary {
              padding: 0.65rem 1.25rem;
              font-size: 0.9rem;
            }

            .group-info-btn {
              padding: 0.4rem 0.75rem;
              font-size: 0.85rem;
            }

            .create-group-btn {
              padding: 0.65rem 1rem;
              font-size: 0.85rem;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
