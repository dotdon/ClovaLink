# ClovaLink

A secure document management and sharing platform built with Next.js, Prisma, and PostgreSQL.

![ClovaLink Logo](public/logo.svg)

## Overview

ClovaLink is a comprehensive document management system designed for businesses to securely store, organize, and share documents. With role-based access control, temporary sharing links, and company-based data isolation, ClovaLink ensures your documents remain secure while enabling efficient collaboration.

## Key Features

- **Secure Document Management**: Upload, store, and manage documents with encryption and access controls
- **Role-Based Access Control**: Different permission levels for administrators, managers, and regular users
- **Temporary Sharing Links**: Create time-limited links for document downloads and uploads
- **Folder Organization**: Organize documents in hierarchical folders
- **Activity Tracking**: Comprehensive logging of all user activities
- **Company Isolation**: Data segregation between different companies
- **Email Notifications**: Automated notifications for important events

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

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 15.x or later
- Docker and Docker Compose (optional)

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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linter
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema changes
- `npm run prisma:reset` - Reset database
- `npm run prisma:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio
- `npm run setup` - Run setup script

## Technologies Used

- **Frontend**: Next.js (React framework)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Local file system (configurable)
- **Containerization**: Docker and Docker Compose

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository or contact the development team. 
