# Docker Setup Guide for ClovaLink

## Quick Start

### Development Environment

1. **Clean Docker Setup** (if you have conflicting containers):
```bash
docker-compose down -v
```

2. **Start Development Environment**:
```bash
docker-compose up --build
```

This will:
- Clean up any previous containers
- Install dependencies
- Copy PDF worker files to public directory
- Start the Next.js dev server
- Start the PostgreSQL database

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com
```

## Troubleshooting

### PDF Files Not Loading

If PDF previews are not working:

1. **Check PDF worker files exist**:
```bash
ls -la public/pdf.worker*
```

2. **Verify files were copied during build**:
```bash
# The build process should copy these files automatically
npm run prebuild
```

3. **Check browser console** for errors (F12):
   - Look for "PDF worker configured" messages
   - Check for CORS or CSP issues

### Docker Containers Not Starting

If you get port conflicts or containers don't start:

1. **Remove all conflicting containers**:
```bash
docker-compose down -v
```

2. **Check for processes using ports 3000 or 5432**:
```bash
lsof -i :3000
lsof -i :5432
```

3. **Use production config if needed** (for production deployment):
```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Database Connection Issues

1. **Verify database is running**:
```bash
docker ps | grep postgres
```

2. **Check database logs**:
```bash
docker logs clovalink-db-1
```

3. **Reset database**:
```bash
docker-compose down -v
docker-compose up
```

## File Structure

- **docker-compose.yml** - Development environment (uses `node:20-bullseye`)
- **docker-compose.prod.yml** - Production environment (multi-stage build)
- **Dockerfile** - Production image definition
- **docker-entrypoint.sh** - Entrypoint script for production containers
- **public/pdf.worker.min.mjs** - PDF.js worker (ES modules)
- **public/pdf.worker.min.js** - PDF.js worker (CommonJS)

## Key Improvements

1. **PDF Worker Files**: Automatically copied from `node_modules/pdfjs-dist/build/` to `public/` during prebuild
2. **Content Security Policy**: Updated to allow blob URLs for PDF workers
3. **Healthchecks**: Added to both app and database services
4. **Clean Environment**: Using `NODE_ENV` variables to differentiate dev/prod

## Production Deployment

For production with NGINX and SSL:

```bash
# Set environment variables
export DOMAIN=yourdomain.com
export DB_PASSWORD=strong-password-here
export NEXTAUTH_SECRET=production-secret-key

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

This includes:
- NGINX reverse proxy
- Let's Encrypt SSL certificates (via Certbot)
- PostgreSQL with persistent volumes
- Next.js production build

