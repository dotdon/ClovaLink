# ClovaLink Podman Setup Guide

This guide covers setting up and running ClovaLink using Podman for containerized deployment.

## Prerequisites

- Podman installed on your system
- Basic understanding of container technology
- 4GB+ RAM available
- 10GB+ disk space

## Installation

### macOS

```bash
brew install podman
```

### Linux

Follow the official installation guide at [podman.io](https://podman.io/getting-started/installation)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/dotdon/ClovaLink.git
cd ClovaLink
```

### 2. Configure Environment Variables

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/clovalink?schema=public

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# SMTP (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com

# Document Encryption
ENCRYPTION_KEY=your-generated-key-here
```

### 3. Generate Encryption Key

```bash
node generate-encryption-key.js
```

Copy the generated key and add it to your `.env` file as `ENCRYPTION_KEY`.

### 4. Initialize Podman Machine (First Time Only)

```bash
podman machine init
podman machine start
```

### 5. Start ClovaLink

```bash
./podman-start.sh
```

This script will:
- Start PostgreSQL database container
- Start the Next.js application container
- Run database migrations
- Seed initial data

### 6. Access the Application

Open your browser and navigate to: `http://localhost:3000`

Default admin credentials:
- Email: `admin@example.com`
- Password: `admin123`

## Container Management

### Start Containers

```bash
./podman-start.sh
```

### Stop Containers

```bash
./podman-stop.sh
```

### View Logs

```bash
# All containers
podman compose -f podman-compose.yml logs -f

# App container only
podman compose -f podman-compose.yml logs -f app

# Database container only
podman compose -f podman-compose.yml logs -f db
```

### Check Container Status

```bash
podman compose -f podman-compose.yml ps
```

### Restart Containers

```bash
podman compose -f podman-compose.yml restart
```

### Access Container Shell

```bash
# App container
podman compose -f podman-compose.yml exec app bash

# Database container
podman compose -f podman-compose.yml exec db psql -U postgres -d clovalink
```

## Database Management

### Run Migrations

```bash
podman compose -f podman-compose.yml exec app npx prisma db push
```

### Seed Database

```bash
podman compose -f podman-compose.yml exec app npx prisma db seed
```

### Open Prisma Studio

```bash
podman compose -f podman-compose.yml exec app npx prisma studio
```

Access Prisma Studio at: `http://localhost:5555`

### Backup Database

```bash
podman compose -f podman-compose.yml exec db pg_dump -U postgres clovalink > backup.sql
```

### Restore Database

```bash
cat backup.sql | podman compose -f podman-compose.yml exec -T db psql -U postgres -d clovalink
```

## File Encryption Migration

If you have existing unencrypted files, run the migration:

```bash
podman compose -f podman-compose.yml exec app npm run encrypt:migrate
```

This will:
- Find all unencrypted documents
- Encrypt each file with company-specific keys
- Update database records with encryption metadata
- Provide a summary report

## Redis Setup (Optional)

Redis is used for rate limiting and caching. While optional, it's recommended for production deployments.

### Using Redis with Podman

1. Add Redis to your `podman-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: clovalink-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

2. Add Redis URL to your `.env`:

```env
REDIS_URL=redis://redis:6379
```

3. Restart containers:

```bash
podman compose -f podman-compose.yml down
podman compose -f podman-compose.yml up -d
```

### Verifying Redis Connection

Check if Redis is working:

```bash
podman compose -f podman-compose.yml exec redis redis-cli ping
# Should respond with: PONG
```

View Redis logs:

```bash
podman compose -f podman-compose.yml logs redis
```

## Troubleshooting

### Containers Won't Start

Check if Podman machine is running:

```bash
podman machine list
podman machine start
```

### Port Already in Use

If port 3000 or 5432 is already in use, modify `podman-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change host port
```

### Database Connection Issues

Ensure the database container is healthy:

```bash
podman compose -f podman-compose.yml exec db pg_isready -U postgres
```

### Permission Denied Errors

Check file permissions in uploads directory:

```bash
chmod -R 755 uploads/
```

### Out of Memory

Increase Podman machine resources:

```bash
podman machine stop
podman machine set --memory 4096
podman machine start
```

### View Container Resource Usage

```bash
podman stats
```

## Production Deployment

### Environment Variables

In production, use environment-specific values:

```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<strong-random-secret>
DATABASE_URL=postgresql://user:password@host:5432/dbname
ENCRYPTION_KEY=<strong-random-key>
```

### SSL/TLS

Configure a reverse proxy (nginx/traefik) for HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Data Persistence

Ensure volumes are configured for data persistence:

```yaml
volumes:
  postgres_data:    # Database data persists
  uploads:          # Uploaded files persist
```

### Scaling

For horizontal scaling, see README.md Security Architecture section for Kubernetes deployment.

## Maintenance

### Update Application

```bash
git pull
podman compose -f podman-compose.yml down
podman compose -f podman-compose.yml up -d --build
```

### Clean Up Unused Resources

```bash
podman system prune -a
```

### View Podman Machine Info

```bash
podman machine info
```

## Support

For issues or questions:
- Check the main README.md
- Review container logs
- Open an issue on GitHub

