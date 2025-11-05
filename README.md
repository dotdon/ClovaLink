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
- **Document Preview**: View supported file types (PDF, DOCX) without downloading

### Security & Authentication
- **Two-Factor Authentication (2FA)**: TOTP-based authentication for enhanced security
- **Passkey Support**: WebAuthn/FIDO2 passwordless authentication
- **Role-Based Access Control**: Different permission levels for administrators, managers, and regular users
- **Company Isolation**: Complete data segregation between different companies

### Sharing & Collaboration
- **Temporary Sharing Links**: Create time-limited links for document downloads and uploads
- **Link Expiration**: Configurable expiration times for shared links
- **Upload Links**: Allow external users to upload files to specific folders

### Monitoring & Tracking
- **Activity Tracking**: Comprehensive logging of all user activities
- **Real-time Notifications**: Live updates for important events
- **Email Notifications**: Automated email notifications for key activities

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

### Document Viewing (Latest)
- ✅ Embedded PDF viewer with full navigation controls
- ✅ DOCX document renderer with formatting support
- ✅ No file size limits for viewing
- ✅ Local PDF.js worker for offline functionality in Docker
- ✅ Black-themed document viewer interface

### Enhanced Navigation
- ✅ Breadcrumb navigation with folder icons
- ✅ Visual folder hierarchy
- ✅ Improved nested folder support

### Security Enhancements
- ✅ Two-Factor Authentication with TOTP
- ✅ WebAuthn/Passkey support for passwordless login
- ✅ Backup codes for 2FA recovery

## Troubleshooting

### PDF Viewer Issues
If PDFs show "Loading PDF..." without displaying:
1. Check browser console (F12) for errors
2. Ensure PDF.js worker is in `public/pdf-worker/`
3. Verify `pdfjs-dist` version matches `react-pdf` version (4.8.69)
4. Try rebuilding: `docker-compose down && docker-compose build && docker-compose up -d`

### DOCX Viewer Issues
If DOCX files don't render:
1. Check that the file is a valid DOCX format
2. Verify `docx-preview` is installed
3. Check browser console for errors

### Docker Issues
If containers won't start:
1. Check logs: `docker logs clovalink-app-1`
2. Verify environment variables in `.env`
3. Ensure ports 3000 and 5432 are available

## Support

For support, please open an issue on the GitHub repository or contact the development team. 
