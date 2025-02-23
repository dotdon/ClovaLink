#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

async function setupLinkVault() {
  console.log('\n🚀 Welcome to LinkVault Setup!\n');
  
  try {
    // Get domain information
    const domain = await question('Enter your domain (e.g., docs.example.com): ');
    
    // Get email for SSL certificate
    const email = await question('Enter email for SSL certificate notifications: ');
    
    // Database configuration
    console.log('\n📦 Database Configuration');
    const dbPassword = await generateRandomString(16);
    console.log('Generated secure database password');
    
    // NextAuth configuration
    console.log('\n🔐 Security Configuration');
    const nextAuthSecret = await generateRandomString(32);
    console.log('Generated NextAuth secret');
    
    // SMTP configuration
    console.log('\n📧 SMTP Configuration (for email notifications)');
    const smtpHost = await question('SMTP Host (e.g., smtp.gmail.com): ');
    const smtpPort = await question('SMTP Port (default: 587): ') || '587';
    const smtpUser = await question('SMTP Username: ');
    const smtpPass = await question('SMTP Password: ');
    const smtpFrom = await question('From Email Address: ');
    
    // File upload configuration
    console.log('\n📁 File Upload Configuration');
    const maxUploadSize = await question('Maximum upload size in MB (default: 10): ') || '10';
    const uploadSizeBytes = parseInt(maxUploadSize) * 1024 * 1024;
    
    // Create .env.prod file
    const envContent = `# Domain
DOMAIN=${domain}

# Database
DB_PASSWORD=${dbPassword}

# NextAuth.js
NEXTAUTH_SECRET=${nextAuthSecret}
NEXTAUTH_URL=https://${domain}

# File Upload
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE=${uploadSizeBytes}
ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png

# SMTP Configuration
SMTP_HOST=${smtpHost}
SMTP_PORT=${smtpPort}
SMTP_USER=${smtpUser}
SMTP_PASS=${smtpPass}
SMTP_FROM=${smtpFrom}

# Application
NODE_ENV=production`;

    await fs.writeFile('.env.prod', envContent);
    console.log('\n✅ Created .env.prod file');

    // Create necessary directories
    await fs.mkdir('certbot/conf', { recursive: true });
    await fs.mkdir('certbot/www', { recursive: true });
    console.log('✅ Created SSL certificate directories');

    // Update nginx.conf with domain
    const nginxTemplate = await fs.readFile('nginx.conf', 'utf8');
    const nginxConfig = nginxTemplate.replace(/\${DOMAIN}/g, domain);
    await fs.writeFile('nginx.conf', nginxConfig);
    console.log('✅ Updated nginx configuration');

    console.log('\n🎉 Setup complete! Next steps:');
    console.log(`
1. Start the application:
   docker compose -f docker-compose.prod.yml up -d

2. Initialize SSL certificate:
   docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d ${domain} --email ${email} --agree-tos --no-eff-email

3. Initialize the database:
   docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
   docker compose -f docker-compose.prod.yml exec app npx prisma db seed

4. Access your LinkVault instance at:
   https://${domain}

Default admin credentials:
Email: admin@company.com
Password: admin123
(Please change these after first login)

For more information, visit: https://github.com/yourusername/linkvault
`);

  } catch (error) {
    console.error('Error during setup:', error);
  } finally {
    rl.close();
  }
}

setupLinkVault(); 