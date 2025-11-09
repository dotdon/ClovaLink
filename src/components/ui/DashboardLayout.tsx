import { Container, Nav, Navbar, Dropdown } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { FaHome, FaBuilding, FaUsers, FaFolder, FaLink, FaSignOutAlt, FaQuestionCircle, FaBars, FaTimes, FaCog, FaUserCircle, FaComments } from 'react-icons/fa';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isDocumentsPage = pathname === '/dashboard/documents';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Scroll to top on route change and initial load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Prevent scroll restoration on page refresh
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // Check password change requirement FIRST (takes precedence over 2FA)
  useEffect(() => {
    const checkPasswordChange = async () => {
      try {
        const response = await fetch('/api/employees/must-change-password');
        if (response.ok) {
          const data = await response.json();
          setMustChangePassword(data.mustChange || false);
          
          // If password change required, redirect IMMEDIATELY (blocks everything including account page)
          if (data.mustChange && pathname !== '/auth/change-password') {
            console.log('[DashboardLayout] 🔒 Password change required - redirecting to change password page');
            router.replace('/auth/change-password');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking password change requirement in layout:', err);
      }
    };
    
    checkPasswordChange();
    // Check less frequently - only every 30 seconds instead of 2
    const interval = setInterval(checkPasswordChange, 30000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  // Fetch profile picture - only once on mount, cache in state
  useEffect(() => {
    if (!session?.user?.id || profilePicture !== null) return; // Skip if already loaded
    
    const fetchProfilePicture = async () => {
      try {
        const response = await fetch(`/api/employees/${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setProfilePicture(data.profilePicture || '');
        }
      } catch (err) {
        console.error('Error fetching profile picture:', err);
        setProfilePicture(''); // Set empty string to prevent refetch
      }
    };
    
    fetchProfilePicture();
  }, [session?.user?.id, profilePicture]);

  // Check if user needs 2FA (only if password change is not required)
  useEffect(() => {
    if (mustChangePassword) return; // Skip 2FA check if password change is needed
    
    const check2FA = async () => {
      try {
        const response = await fetch('/api/auth/check-2fa-requirement');
        if (response.ok) {
          const data = await response.json();
          setNeeds2FA(data.needs2FA || false);
          
          // If user needs 2FA and is not on account page, redirect
          if (data.needs2FA && !pathname.startsWith('/dashboard/account') && pathname !== '/auth/change-password') {
            console.log('[DashboardLayout] 🚫 User needs 2FA - redirecting to account page');
            router.replace('/dashboard/account?require2fa=true');
          }
        }
      } catch (err) {
        console.error('Error checking 2FA requirement in layout:', err);
      }
    };
    
    check2FA();
    // Check less frequently - only every 30 seconds
    const interval = setInterval(check2FA, 30000);
    return () => clearInterval(interval);
  }, [pathname, router, mustChangePassword]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut({ 
      callbackUrl: '/auth/signin',
      redirect: true 
    });
  };

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaHome },
    { path: '/dashboard/companies', label: 'Companies', icon: FaBuilding, adminOnly: true },
    { path: '/dashboard/employees', label: 'Employees', icon: FaUsers },
    { path: '/dashboard/documents', label: 'Documents', icon: FaFolder },
    { path: '/dashboard/messages', label: 'Messages', icon: FaComments },
    { path: '/dashboard/upload-links', label: 'Upload Links', icon: FaLink },
    { path: '/dashboard/account', label: 'My Account', icon: FaUserCircle },
    { path: '/dashboard/settings', label: 'Settings', icon: FaCog, adminOnly: true },
    { path: '/dashboard/help', label: 'Help & FAQs', icon: FaQuestionCircle },
  ];

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => {
    if (item.adminOnly) {
      return session?.user?.role === 'ADMIN';
    }
    return true;
  });

  return (
    <div className="dashboard-layout">
      {/* Desktop Navigation */}
      <nav className="desktop-nav">
        <div className="nav-header">
          <Link href="/dashboard" className="brand">
            <div className="logo-container">
              <Image
                src="/logo.svg"
                alt="ClovaLink"
                width={200}
                height={200}
                className="logo-image"
                style={{ filter: 'brightness(0) invert(1)' }}
                priority
                unoptimized
              />
            </div>
          </Link>
          <div className="user-profile-section">
            <div className="profile-avatar">
              {profilePicture ? (
                <img 
                  src={`/api/employees/profile-picture/${profilePicture}`}
                  alt={session?.user?.name || 'User'}
                  loading="lazy"
                />
              ) : (
                <FaUserCircle />
              )}
            </div>
            <div className="profile-info">
              <div className="profile-name">{session?.user?.name}</div>
              <div className="profile-role">{session?.user?.role}</div>
            </div>
          </div>
        </div>
        <div className="nav-items">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            // Block navigation if password change required (blocks everything)
            // OR if user needs 2FA and this isn't the account page
            const isBlocked = mustChangePassword || (needs2FA && item.path !== '/dashboard/account');
            return (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={(e) => {
                  if (isBlocked) {
                    e.preventDefault();
                    if (mustChangePassword) {
                      console.log('[DashboardLayout] 🔒 Blocked navigation to', item.path, '- password change required');
                      router.push('/auth/change-password');
                    } else {
                      console.log('[DashboardLayout] 🚫 Blocked navigation to', item.path, '- user needs 2FA');
                      router.push('/dashboard/account?require2fa=true');
                    }
                  }
                }}
                className={`nav-item ${pathname === item.path ? 'active' : ''} ${isBlocked ? 'disabled' : ''}`}
                style={isBlocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
          <a href="/auth/signout" onClick={handleSignOut} className="nav-item">
            <FaSignOutAlt className="nav-icon" />
            <span className="nav-label">Sign Out</span>
          </a>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="header-content">
          <button 
            className="menu-button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <FaBars />
          </button>
          <Link href="/dashboard" className="mobile-header-logo">
            <Image
              src="/logo.svg"
              alt="ClovaLink"
              width={300}
              height={300}
              style={{ filter: 'brightness(0) invert(1)' }}
              priority
              unoptimized
            />
          </Link>
          <Link href="/dashboard/account" className="mobile-profile-avatar">
            {profilePicture ? (
              <img 
                src={`/api/employees/profile-picture/${profilePicture}`}
                alt={session?.user?.name || 'User'}
                loading="lazy"
              />
            ) : (
              <FaUserCircle />
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Side Menu */}
      <div className={`mobile-side-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <Link href="/dashboard" className="brand" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="logo-container mobile-logo-container">
              <Image
                src="/logo.svg"
                alt="ClovaLink"
                width={200}
                height={200}
                className="logo-image"
                style={{ 
                  filter: 'brightness(0) invert(1)',
                  transform: 'scale(1.5)',
                  transformOrigin: 'center center'
                }}
                priority
                unoptimized
              />
            </div>
          </Link>
          <button 
            className="close-button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        <div className="side-menu-items">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            // Block navigation if password change required (blocks everything)
            // OR if user needs 2FA and this isn't the account page
            const isBlocked = mustChangePassword || (needs2FA && item.path !== '/dashboard/account');
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`side-menu-item ${pathname === item.path ? 'active' : ''} ${isBlocked ? 'disabled' : ''}`}
                style={isBlocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                onClick={(e) => {
                  if (isBlocked) {
                    e.preventDefault();
                    if (mustChangePassword) {
                      console.log('[DashboardLayout] 🔒 Blocked mobile navigation to', item.path, '- password change required');
                      router.push('/auth/change-password');
                    } else {
                      console.log('[DashboardLayout] 🚫 Blocked mobile navigation to', item.path, '- user needs 2FA');
                      router.push('/dashboard/account?require2fa=true');
                    }
                    setIsMobileMenuOpen(false);
                  } else {
                    setIsMobileMenuOpen(false);
                  }
                }}
              >
                <Icon className="side-menu-icon" />
                <span className="side-menu-label">{item.label}</span>
              </Link>
            );
          })}
          <a href="/auth/signout" onClick={handleSignOut} className="side-menu-item">
            <FaSignOutAlt className="side-menu-icon" />
            <span className="side-menu-label">Sign Out</span>
          </a>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`main-content ${isDocumentsPage ? 'is-documents' : ''} ${pathname === '/dashboard' ? 'dashboard-page' : 'content-page'}`}>
        {children}
      </main>

      {/* Global Footer */}
      <footer className="global-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <Image
                src="/logo.svg"
                alt="ClovaLink"
                width={168}
                height={168}
                style={{ filter: 'brightness(0) invert(1)' }}
                unoptimized
              />
            </div>
            <p className="footer-tagline">Secure document management for your organization</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><Link href="/dashboard">Dashboard</Link></li>
              <li><Link href="/dashboard/documents">Documents</Link></li>
              <li><Link href="/dashboard/help">Help & FAQs</Link></li>
              <li><Link href="/dashboard/account">My Account</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Support</h4>
            <ul className="footer-links">
              <li><Link href="/dashboard/help">Documentation</Link></li>
              <li><a href="mailto:support@clovalink.com">Contact Support</a></li>
              {session?.user?.role === 'ADMIN' && (
                <li><Link href="/dashboard/settings">Settings</Link></li>
              )}
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <ul className="footer-links">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} ClovaLink. All rights reserved.</p>
        </div>
      </footer>

      <style jsx global>{`
        /* Base styles */
        .dashboard-layout {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0015 0%, #1a0033 50%, #2d1b4e 100%);
          background-size: 200% 200%;
          animation: gradientShift 20s ease infinite;
          display: flex;
          flex-direction: column;
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Desktop Navigation */
        .desktop-nav {
          display: none;
          width: 280px;
          background: #000000;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          color: #fff;
          padding: 1.5rem 1rem;
          z-index: 1000;
          flex-shrink: 0;
          box-shadow: 2px 0 10px rgba(0,0,0,0.3);
        }

        .nav-header {
          padding: 0.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          margin-bottom: 1.5rem;
        }

        .user-profile-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          margin-top: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .profile-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #667eea;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-avatar svg {
          width: 28px;
          height: 28px;
          color: #fff;
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-role {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

          .mobile-profile-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            flex-shrink: 0;
            text-decoration: none;
            min-width: 52px;
            font-size: 1.1rem;
            font-weight: 600;
            color: white;
            transition: all 0.2s ease;
          }

          .mobile-profile-avatar:hover {
            border-color: rgba(255,255,255,0.5);
            transform: scale(1.05);
          }

          .mobile-profile-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .mobile-profile-avatar svg {
            width: 26px;
            height: 26px;
            color: #fff;
          }

        .brand {
          color: #fff;
          text-decoration: none;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          justify-content: center;
          width: 100%;
          letter-spacing: 0.5px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
        }

        .logo-image {
          border-radius: 12px;
          transition: opacity 0.2s ease;
        }

        .brand:hover .logo-image {
          opacity: 0.8;
        }

        .nav-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 12px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          position: relative;
          overflow: visible;
          margin-bottom: 0.375rem;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff !important;
          transform: translateX(6px) scale(1.02);
        }
        
        .nav-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
          transform: translateX(8px) scale(1.05);
        }
        
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          height: 70%;
          width: 5px;
          background: #ffffff;
          border-radius: 0 8px 8px 0;
          box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        
        .nav-item.active::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 12px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .nav-icon {
          margin-right: 0.75rem;
          font-size: 1.25rem;
        }

        /* Mobile Header Styles */
        .mobile-header {
          background: #000000;
          padding: 0;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          width: 100%;
          height: 80px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          padding: 0 1rem;
          gap: 0.75rem;
        }

        .menu-button {
          background: none;
          border: none;
          color: #fff;
          font-size: 2rem;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 52px;
          height: 52px;
        }

        .mobile-header-logo {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: opacity 0.2s ease;
          max-width: 0;
          height: 0;
          overflow: hidden;
          opacity: 0;
          visibility: hidden;
        }

        .mobile-header-logo img {
          display: none;
        }

        .mobile-header-logo:hover {
          opacity: 0;
        }

        .side-menu-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mobile-logo-container {
          height: 60px;
          width: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: visible;
        }

        .close-button {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

          /* Mobile optimizations */
          @media (max-width: 1023px) {
            .mobile-header, .mobile-side-menu {
              display: block;
            }

            .desktop-nav {
              display: none;
            }

            .main-content {
              padding-top: 95px !important;
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }

            .main-content.is-documents {
              padding-top: 95px !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }

            .logo-image {
              width: 100px;
              height: 100px;
            }
          }

        /* Main Content */
        .main-content {
          flex: 1;
          padding: 1rem;
          padding-bottom: calc(60px + 1rem);
          min-height: 100vh;
        }

        .main-content.is-documents {
          padding: 0;
          padding-bottom: 60px;
        }

        /* Mobile Side Menu */
        .mobile-side-menu {
          position: fixed;
          top: 0;
          left: -280px;
          width: 280px;
          height: 100vh;
          background: #000000;
          z-index: 1100;
          transition: left 0.3s ease;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 10px rgba(0,0,0,0.3);
        }

        .mobile-side-menu.open {
          left: 0;
        }

        .side-menu-items {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .side-menu-item {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 12px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          position: relative;
          overflow: visible;
          margin-bottom: 0.375rem;
        }

        .side-menu-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff !important;
          transform: translateX(6px) scale(1.02);
        }
        
        .side-menu-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
          transform: translateX(8px) scale(1.05);
        }
        
        .side-menu-item.active::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          height: 70%;
          width: 5px;
          background: #ffffff;
          border-radius: 0 8px 8px 0;
          box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        
        .side-menu-item.active::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 12px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .side-menu-icon {
          margin-right: 0.75rem;
          font-size: 1.25rem;
        }

        .side-menu-label {
          font-size: 1rem;
        }

        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1050;
        }

        /* Main Content Adjustments */
        .main-content {
          padding-bottom: 1rem;
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          .mobile-header, 
          .mobile-side-menu,
          .mobile-menu-overlay,
          .menu-button {
            display: none;
          }

          .desktop-nav {
            display: block;
          }

          .main-content {
            margin-left: 280px;
            padding: 2rem;
            width: calc(100% - 280px);
          }

          .main-content.is-documents {
            margin-left: 280px;
            padding: 0;
            width: calc(100% - 280px);
          }
        }

        /* Ensure proper content scaling */
        .container {
          width: 100%;
          padding-right: 1rem;
          padding-left: 1rem;
          margin-right: auto;
          margin-left: auto;
        }

        @media (min-width: 640px) {
          .container { max-width: 640px; }
        }

        @media (min-width: 768px) {
          .container { max-width: 768px; }
        }

        @media (min-width: 1024px) {
          .container { max-width: 1024px; }
        }

        @media (min-width: 1280px) {
          .container { max-width: 1280px; }
        }

        @media (min-width: 1536px) {
          .container { max-width: 1536px; }
        }

        /* Global Footer */
        .global-footer {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
          border-top: 1px solid rgba(102, 126, 234, 0.2);
          padding: 1.5rem 2rem 1rem;
          margin-top: 2rem;
          color: white;
        }

        @media (min-width: 1024px) {
          .global-footer {
            margin-left: 280px;
            width: calc(100% - 280px);
          }
        }

        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 767px) {
          .footer-content {
            grid-template-columns: 1fr;
            gap: 1.25rem;
            text-align: center;
          }

          .global-footer {
            padding: 1.25rem 1rem 0.75rem;
            margin-top: 1.5rem;
          }
        }

        .footer-section h4 {
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 0.65rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .footer-logo {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        @media (max-width: 767px) {
          .footer-logo {
            justify-content: center;
          }
        }

        .footer-logo img {
          max-width: 126px;
          height: auto;
        }

        .footer-tagline {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
          line-height: 1.4;
          max-width: 220px;
        }

        @media (max-width: 767px) {
          .footer-tagline {
            max-width: 100%;
          }
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 0.5rem;
        }

        .footer-links a {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          display: inline-block;
        }

        .footer-links a:hover {
          color: #ffffff;
          transform: translateX(4px);
        }

        .footer-bottom {
          text-align: center;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
        }

        .footer-bottom p {
          margin: 0;
        }

        @media (max-width: 767px) {
          .footer-bottom {
            padding-top: 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
} 