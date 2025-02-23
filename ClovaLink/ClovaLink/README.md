# ClovaLink

A secure document management and sharing platform built with Next.js, Prisma, and PostgreSQL.

## Features

- Secure document upload and management
- Role-based access control
- Temporary sharing links for downloads and uploads
- Folder organization with automatic categorization
- Activity tracking and logging
- Email notifications
- Company-based data isolation

## Prerequisites

- Node.js 20.x or later
- PostgreSQL 15.x or later
- Docker and Docker Compose (optional)

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/clovalink.git
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
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/clovalink.git
   cd clovalink
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

3. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

4. Initialize the database:
   ```bash
   docker-compose exec app npx prisma migrate deploy
   docker-compose exec app npx prisma db seed
   ```

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Base URL of your application
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `SMTP_*`: Email configuration
- `UPLOAD_DIR`: Directory for file uploads
- `MAX_FILE_SIZE`: Maximum allowed file size
- `ALLOWED_FILE_TYPES`: Comma-separated list of allowed file extensions

## Usage

1. Access the application at `http://localhost:3000`
2. Log in with your credentials
3. Start managing documents and folders
4. Create upload/download links as needed

## Development

### Database Management

- Generate Prisma client: `npx prisma generate`
- Create migration: `npx prisma migrate dev`
- Reset database: `npx prisma migrate reset`
- View database: `npx prisma studio`

### Testing

```bash
npm run test
```

### Building

```bash
npm run build
```

## Security

- All files are scanned for malware upon upload
- Temporary links expire automatically
- Role-based access control
- Company data isolation
- Encrypted file storage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 