# ClovaLink

A secure document management and sharing platform built with Next.js, Prisma, and PostgreSQL.

![ClovaLink Logo](public/logo.svg)

## Overview

ClovaLink is a comprehensive document management system designed for businesses to securely store, organize, and share documents. With role-based access control, temporary sharing links, and company-based data isolation, ClovaLink ensures your documents remain secure while enabling efficient collaboration.

## Key Features

### Document Management
- **Secure Document Management**: Upload, store, and manage documents with encryption and access controls
- **PDF Viewer**: Embedded PDF viewer with page navigation, zoom controls, and fullscreen mode
- **DOCX Viewer**: View Word documents directly in the browser with formatting preserved
- **Nested Folder Organization**: Create folders within folders with unlimited depth
- **Enhanced Breadcrumb Navigation**: Visual folder hierarchy with icons for easy navigation
- **Drag & Drop**: Move documents and folders by dragging them into other folders
- **Advanced Move Functionality**: Move files and folders within company or across companies with intuitive modal
- **Document Preview**: View supported file types (PDF, DOCX) without downloading
- **Password Protection**: Secure individual documents and folders with password protection
- **Quick Access & Pinning**: Pin frequently used folders for instant access
- **Favorites/Starred Items**: Star documents and folders for easy access in dedicated Starred view
- **Grid & List Views**: Toggle between grid and list views for optimal document browsing

### Security & Authentication
- **Two-Factor Authentication (2FA)**: TOTP-based authentication for enhanced security
- **Passkey Support**: WebAuthn/FIDO2 passwordless authentication
- **Role-Based Access Control**: Different permission levels for administrators, managers, and regular users
- **Company Isolation**: Complete data segregation between different companies
- **Cross-Company Access**: Grant employees access to multiple companies with proper permissions
- **Document & Folder Passwords**: Additional layer of security for sensitive files and folders

### Sharing & Collaboration
- **Temporary Sharing Links**: Create time-limited links for document downloads and uploads
- **Link Expiration**: Configurable expiration times for shared links
- **Upload Links**: Allow external users to upload files to specific folders

### Monitoring & Tracking
- **Activity Tracking**: Comprehensive logging of all user activities with per-item activity logs
- **Real-time Notifications**: Live updates for important events
- **Email Notifications**: Automated email notifications for key activities
- **Document Information**: Detailed metadata for documents and folders including size, dates, and permissions

## Documentation

Comprehensive documentation is available in our [GitHub Wiki](https://github.com/dotdon/ClovaLink/wiki).

The wiki includes:
- [System Architecture](https://github.com/dotdon/ClovaLink/wiki#system-architecture)
- [Database Schema](https://github.com/dotdon/ClovaLink/wiki#database-schema)
- [Project Structure](https://github.com/dotdon/ClovaLink/wiki#project-structure)
- [Authentication & Authorization](https://github.com/dotdon/ClovaLink/wiki#authentication--authorization)
- [Core Features](https://github.com/dotdon/ClovaLink/wiki#core-features)
- [API Endpoints](https://github.com/dotdon/ClovaLink/wiki#api-endpoints)
- [Deployment Guide](https://github.com/dotdon/ClovaLink/wiki#deployment)
- [Development Guide](https://github.com/dotdon/ClovaLink/wiki#development-guide)
- [Troubleshooting](https://github.com/dotdon/ClovaLink/wiki#troubleshooting)

Additional documentation:
- [API Documentation](https://github.com/dotdon/ClovaLink/wiki/API-Documentation)
- [Technical Guide](https://github.com/dotdon/ClovaLink/wiki/Technical-Guide)
- [User Guide](https://github.com/dotdon/ClovaLink/wiki/User-Guide)

## Supported File Types

### Viewable in Browser
- **PDF**: Full embedded viewer with navigation, zoom, and fullscreen
- **DOCX**: Microsoft Word documents with formatting preserved

### Uploadable File Types
- Documents: PDF, DOC, DOCX, TXT, CSV
- Spreadsheets: XLS, XLSX
- Presentations: PPT, PPTX
- Images: JPEG, PNG, GIF, WebP, SVG
- Archives: ZIP, RAR, 7Z
- Other: JSON, XML

**Note**: Files without embedded viewers can still be downloaded and viewed in their native applications.

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 15.x or later
- Docker and Docker Compose (optional)
- Modern web browser with WebAuthn support (for passkey authentication)

## Quick Start

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/dotdon/clovalink.git
   cd clovalink
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

4. Set up the database:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/dotdon/clovalink.git
   cd clovalink
   ```

2. Set up environment variables:
   ```bash
   cp .env.prod.example .env
   ```
   Edit `.env` with your configuration.

3. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

4. Initialize the database:
   ```bash
   docker-compose exec app npx prisma db push
   docker-compose exec app npx prisma db seed
   ```

## Available Scripts

- `npm run dev` - Start development server (includes PDF worker copy)
- `npm run build` - Build for production (includes PDF worker copy)
- `npm run start` - Start production server
- `npm run lint` - Run linter
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:seed` - Seed database with initial data
- `npm run prisma:studio` - Open Prisma Studio for database management
- `npm run setup` - Run initial setup script

**Note**: The PDF.js worker file is automatically copied to the public folder during `npm install`, `npm run dev`, and `npm run build` to ensure proper PDF viewing functionality.

## Technologies Used

### Core Stack
- **Frontend**: Next.js 15.x (React 19 framework)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL 15.x with Prisma ORM
- **Authentication**: NextAuth.js with multi-factor authentication
- **File Storage**: Local file system (configurable)
- **Containerization**: Docker and Docker Compose

### Document Viewing
- **react-pdf**: PDF.js integration for PDF rendering
- **pdfjs-dist**: PDF.js core library for document parsing
- **docx-preview**: DOCX file rendering in the browser

### Authentication & Security
- **@simplewebauthn/server**: WebAuthn/FIDO2 server implementation
- **@simplewebauthn/browser**: WebAuthn client library
- **otpauth**: TOTP (Time-based One-Time Password) generation
- **bcryptjs**: Password hashing

### UI/UX
- **React Bootstrap**: UI component library
- **react-icons**: Icon library
- **Socket.io**: Real-time communication

### Utilities
- **Archiver & JSZip**: File compression and archive handling
- **Nodemailer**: Email sending functionality
- **Pino**: Logging framework

## Project Structure

### Document Viewer Components
```
src/components/viewers/
├── PdfViewer.tsx           # PDF document viewer with controls
├── DocxViewer.tsx          # DOCX document renderer
└── DocumentViewerModal.tsx # Unified modal for document viewing
```

### Key Directories
```
src/
├── app/
│   ├── api/                # API routes
│   │   ├── documents/      # Document management endpoints
│   │   ├── passkey/        # WebAuthn/Passkey authentication
│   │   ├── totp/           # TOTP 2FA endpoints
│   │   └── ...
│   ├── dashboard/          # Dashboard pages
│   └── auth/               # Authentication pages
├── components/
│   ├── ui/                 # UI components
│   └── viewers/            # Document viewer components
├── lib/
│   ├── auth.ts             # Authentication configuration
│   ├── twoFactor.ts        # 2FA utilities
│   ├── webauthn.ts         # WebAuthn/Passkey utilities
│   ├── totp.ts             # TOTP generation
│   └── fileValidation.ts   # File upload validation
└── middleware.ts           # Next.js middleware for auth
```

### Public Assets
```
public/
├── pdf-worker/             # PDF.js worker (auto-generated)
│   └── pdf.worker.min.mjs
└── logo.svg                # ClovaLink logo
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and conventions
- Test PDF and DOCX viewing after any changes to viewer components
- Ensure 2FA and passkey authentication work after auth changes
- Run `npm run lint` before committing
- Update documentation for significant changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Recent Updates

### Document Management Enhancements (Latest)
- ✅ **Cross-Company File Moving**: Move documents and folders between companies you have access to
- ✅ **Advanced Move Modal**: Beautiful, intuitive interface for moving files within or across companies
- ✅ **Quick Access Pinning**: Pin frequently used folders for instant access
- ✅ **Favorites System**: Star documents and folders with dedicated Starred view tab
- ✅ **Password Protection**: Secure documents and folders with individual passwords
- ✅ **Grid & List Views**: Toggle between viewing modes for optimal browsing experience
- ✅ **Nested Folder Navigation**: Full path display in move modal (Parent / Child / Grandchild)
- ✅ **Activity Logs**: Per-item activity tracking accessible from dropdown menu

### Document Viewing
- ✅ Embedded PDF viewer with full navigation controls
- ✅ DOCX document renderer with formatting support
- ✅ No file size limits for viewing
- ✅ Local PDF.js worker for offline functionality in Docker
- ✅ Dark-themed document viewer interface

### Enhanced Navigation
- ✅ Breadcrumb navigation with folder icons
- ✅ Visual folder hierarchy
- ✅ Improved nested folder support
- ✅ Drag & drop file organization

### Security Enhancements
- ✅ Two-Factor Authentication with TOTP
- ✅ WebAuthn/Passkey support for passwordless login
- ✅ Backup codes for 2FA recovery
- ✅ Document and folder password protection
- ✅ Cross-company access control

## Frequently Asked Questions (FAQ)

### General Usage

**Q: How do I move files and folders?**
A: Click the three-dot menu (⋮) on any file or folder and select "Move to...". You can move items to any folder within your current company, move them to root (top level), or move them to different companies if you have cross-company access.

**Q: How do I organize my documents?**
A: You can:
- Create nested folders with unlimited depth
- Drag and drop files/folders into other folders
- Use the "Move to..." option for precise placement
- Pin frequently used folders to Quick Access
- Star important items for easy access in the Starred tab

**Q: What's the difference between Pinning and Starring?**
A: 
- **Pinning** is for folders only and displays them in the Quick Access section at the top of the page for instant navigation
- **Starring** works for both files and folders and displays them in the dedicated "Starred" tab, similar to Google Drive's starred items

**Q: How do I protect sensitive documents?**
A: Click the three-dot menu on a document or folder and select "Set Password". Anyone trying to access the protected item will need to enter the password.

**Q: Can I move files between companies?**
A: Yes! If you have access to multiple companies, the Move modal will show a "Move to Different Company" section where you can select the target company and destination folder.

### Access & Permissions

**Q: What are the different user roles?**
A: ClovaLink has three roles:
- **User**: Can view, upload, and manage their own documents
- **Manager**: Can manage users and documents within their company
- **Admin**: Full system access, can manage all companies and users

**Q: How do I get access to multiple companies?**
A: An administrator must grant you cross-company access. Once granted, you'll see a company switcher dropdown in the documents page.

**Q: What happens to my documents when I move them to another company?**
A: The documents are transferred to the new company and will only be accessible by users who have access to that company. The move is logged in the activity tracker.

### Document Viewing

**Q: Which file types can I view in the browser?**
A: Currently, PDF and DOCX files can be viewed directly in the browser. Other file types can be downloaded and viewed in their native applications.

**Q: Why can't I see the PDF preview?**
A: Ensure:
1. Your browser supports PDF viewing
2. The file is a valid PDF
3. Check browser console (F12) for errors
4. Try refreshing the page

**Q: How do I view password-protected documents?**
A: When you click on a password-protected document, a modal will appear asking for the password. Enter the correct password to view or download the document.

### Sharing & Links

**Q: How do I share documents with external users?**
A: Click the three-dot menu on a document or folder and select "Share Link". You can create temporary download links with configurable expiration times.

**Q: Can external users upload files?**
A: Yes! Create an upload link from the "Upload Links" page. Share this link with external users to allow them to upload files to a specific folder.

**Q: How long do share links last?**
A: You can configure the expiration time when creating a link. Options range from a few hours to several days, or you can set a custom expiration date.

### Organization & Navigation

**Q: How do I navigate nested folders quickly?**
A: Use:
- **Breadcrumb navigation** at the top to jump to any parent folder
- **Quick Access** section to jump directly to pinned folders
- **Starred tab** to access favorite items quickly
- **Back button** to go up one level

**Q: Can I see all folders at once when moving files?**
A: Yes! The Move modal displays all folders in a hierarchical list with full paths (e.g., "Parent / Child / Grandchild"), making it easy to select the exact destination.

**Q: How do I move items out of a folder back to root?**
A: Use the "Move to..." option and select "📁 Root (Top level - no folder)" in the destination dropdown.

### Search & Filtering

**Q: How do I search for documents?**
A: Use the search bar at the top of the documents page. It searches through document and folder names in real-time.

**Q: Can I filter documents by type or date?**
A: Use the sort dropdown to sort by name, date, or file size. You can also toggle between grid and list views for different browsing experiences.

### Activity & Tracking

**Q: How do I see who accessed a document?**
A: Click the three-dot menu on any document or folder and select "Activity Log" to see all activities related to that item.

**Q: What activities are tracked?**
A: ClovaLink tracks uploads, downloads, moves, renames, deletions, shares, password changes, and access attempts.

## Troubleshooting

### PDF Viewer Issues

**Problem**: PDFs show "Loading PDF..." without displaying

**Solutions**:
1. Check browser console (F12) for errors
2. Ensure PDF.js worker is in `public/pdf-worker/`
3. Verify `pdfjs-dist` version matches `react-pdf` version (4.8.69)
4. Clear browser cache and refresh
5. Try rebuilding: `docker-compose down && docker-compose build && docker-compose up -d`

### DOCX Viewer Issues

**Problem**: DOCX files don't render

**Solutions**:
1. Verify the file is a valid DOCX format (not DOC)
2. Check that `docx-preview` is installed: `npm list docx-preview`
3. Check browser console for errors
4. Try downloading and opening in Microsoft Word to verify file integrity

### Move Modal Issues

**Problem**: Can't see folders when trying to move

**Solutions**:
1. Ensure you have permission to access the target location
2. If moving a folder, ensure you're not trying to move it into itself or its children
3. Refresh the page to reload the folder structure
4. Check that you have folders created in the target company

### Password Protection Issues

**Problem**: Forgot password for a document/folder

**Solutions**:
1. Contact your administrator - they can remove password protection
2. Administrators can access password-protected items without the password
3. Passwords are stored securely and cannot be recovered, only reset

### Cross-Company Access Issues

**Problem**: Can't see multiple companies

**Solutions**:
1. Verify an administrator has granted you cross-company access
2. Check the `/api/employees/me/accessible-companies` endpoint
3. Try logging out and back in
4. Contact your administrator to verify permissions

### Docker Issues

**Problem**: Containers won't start

**Solutions**:
1. Check logs: `docker-compose logs app` or `docker logs clovalink-app-1`
2. Verify environment variables in `.env`
3. Ensure ports 3000 and 5432 are available
4. Check disk space: `df -h`
5. Try cleaning up: `docker-compose down -v && docker-compose up -d`

**Problem**: Database connection errors

**Solutions**:
1. Verify PostgreSQL is running: `docker-compose ps`
2. Check DATABASE_URL in `.env`
3. Ensure database is initialized: `docker-compose exec app npx prisma db push`
4. Check database logs: `docker-compose logs db`

### Performance Issues

**Problem**: Slow file uploads

**Solutions**:
1. Check file size - extremely large files may take time
2. Verify network connection
3. Check Docker container resources
4. Monitor disk I/O: `docker stats`

**Problem**: Slow folder navigation

**Solutions**:
1. Reduce number of items in a single folder (consider organizing into subfolders)
2. Clear browser cache
3. Check server resources
4. Restart the app container: `docker-compose restart app`

## Support

For support, please:
- Open an issue on the [GitHub repository](https://github.com/dotdon/ClovaLink/issues)
- Check the [GitHub Wiki](https://github.com/dotdon/ClovaLink/wiki) for detailed documentation
- Contact the development team

**Common Support Questions**:
- Feature requests: Open an issue with the "enhancement" label
- Bug reports: Open an issue with detailed reproduction steps
- Security issues: Email the development team directly
- General questions: Check the FAQ above or open a discussion 
