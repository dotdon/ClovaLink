import { Container, Nav, Navbar, Dropdown } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaHome, FaBuilding, FaUsers, FaFolder, FaLink, FaSignOutAlt, FaQuestionCircle, FaBars, FaTimes, FaCog } from 'react-icons/fa';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isDocumentsPage = pathname === '/dashboard/documents';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaHome },
    { path: '/dashboard/companies', label: 'Companies', icon: FaBuilding },
    { path: '/dashboard/employees', label: 'Employees', icon: FaUsers },
    { path: '/dashboard/documents', label: 'Documents', icon: FaFolder },
    { path: '/dashboard/upload-links', label: 'Upload Links', icon: FaLink },
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
              />
            </div>
          </Link>
        </div>
        <div className="nav-items">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
          <a href="/api/auth/signout" className="nav-item">
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
          <h1 className="page-title">
            {pathname === '/dashboard' ? 'Dashboard' : navigationItems.find(item => item.path === pathname)?.label || 'ClovaLink'}
          </h1>
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
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`side-menu-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="side-menu-icon" />
                <span className="side-menu-label">{item.label}</span>
              </Link>
            );
          })}
          <a href="/api/auth/signout" className="side-menu-item">
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
          height: 60px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }

        .header-content {
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0 1rem;
        }

        .menu-button {
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

        .page-title {
          color: #fff;
          font-size: 1.25rem !important;
          margin: 0;
          margin-left: 1rem;
          font-weight: 600;
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
            padding-top: 76px !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .main-content.is-documents {
            padding-top: 76px !important;
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
      `}</style>
    </div>
  );
} 