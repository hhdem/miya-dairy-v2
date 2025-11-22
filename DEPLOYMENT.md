# Deployment Guide

This guide covers deploying Miya Dairy v2 to production.

## Pre-Deployment Checklist

- [ ] Change default admin credentials
- [ ] Set strong JWT secret in `.env`
- [ ] Configure production database
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure proper CORS origins
- [ ] Set up backup strategy
- [ ] Configure monitoring/logging
- [ ] Test all critical flows
- [ ] Review security settings

## Production Environment Setup

### 1. Environment Variables

Create a `.env` file with production values:

```env
# Database
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_USER=your-db-user
DATABASE_PASSWORD=strong-password-here
DATABASE_NAME=miya_dairy_prod

# Backend
BACKEND_PORT=3000
NODE_ENV=production

# JWT - Use a strong random string
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Storage
UPLOAD_DIR=/var/www/uploads
MAX_FILE_SIZE_MB=20

# Frontend URLs
FRONTEND_ADMIN_URL=https://admin.yourdomain.com
FRONTEND_PUBLIC_URL=https://gallery.yourdomain.com
```

### 2. Database Setup

```bash
# Create production database
createdb miya_dairy_prod

# Run migrations
cd packages/backend
NODE_ENV=production npm run migration:run

# Verify migrations
psql -d miya_dairy_prod -c "SELECT * FROM migrations"
```

### 3. Build for Production

```bash
# Install dependencies
npm ci --production=false

# Build all packages
npm run build

# Verify builds
ls -la packages/*/dist
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Configure docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_DB: ${DATABASE_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
    env_file:
      - .env
    volumes:
      - uploads:/var/www/uploads
    depends_on:
      - postgres
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./packages/frontend-admin/dist:/usr/share/nginx/html/admin
      - ./packages/frontend-public/dist:/usr/share/nginx/html/gallery
      - uploads:/usr/share/nginx/html/uploads
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  uploads:
```

2. **Deploy**

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Option 2: Manual Deployment

#### Backend (Node.js)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd packages/backend
pm2 start dist/main.js --name miya-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Frontend (Static Files)

Serve built frontend files with Nginx:

```nginx
# /etc/nginx/sites-available/miya-dairy

server {
    listen 80;
    server_name gallery.yourdomain.com;

    root /var/www/miya-dairy/frontend-public/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;

    root /var/www/miya-dairy/frontend-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/miya-dairy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: Cloud Platforms

#### Heroku

1. Create apps:
```bash
heroku create miya-dairy-api
heroku create miya-dairy-admin
heroku create miya-dairy-gallery
```

2. Add PostgreSQL:
```bash
heroku addons:create heroku-postgresql:hobby-dev -a miya-dairy-api
```

3. Deploy:
```bash
git push heroku main
```

#### Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy admin
cd packages/frontend-admin
vercel --prod

# Deploy public gallery
cd packages/frontend-public
vercel --prod
```

#### Railway

1. Connect GitHub repository
2. Configure services in railway.toml
3. Set environment variables
4. Deploy automatically on push

## SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d gallery.yourdomain.com -d admin.yourdomain.com

# Auto-renewal is configured automatically
```

### Manual Certificate

```nginx
server {
    listen 443 ssl http2;
    server_name gallery.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of configuration
}
```

## Database Backup

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/miya-dairy"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DATE}.sql"

# Create backup
pg_dump -h localhost -U postgres miya_dairy_prod > "${BACKUP_DIR}/${FILENAME}"

# Compress
gzip "${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 days
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp "${BACKUP_DIR}/${FILENAME}.gz" s3://your-bucket/backups/
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

## Monitoring

### Health Check Endpoint

The backend exposes `/api/health`:

```bash
curl http://localhost:3000/api/health
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs miya-backend

# Docker logs
docker compose logs -f backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Monitoring Tools

- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry
- **Performance:** New Relic, DataDog
- **Logs:** CloudWatch, Papertrail

## Performance Optimization

### Backend

1. **Enable compression:**
```typescript
// main.ts
import compression from 'compression';
app.use(compression());
```

2. **Enable caching:**
```typescript
@CacheInterceptor()
@Get('/photos')
async getPhotos() { ... }
```

3. **Database indexes:**
```sql
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_visibility ON photos(visibility);
```

### Frontend

1. **CDN for static assets:**
```javascript
// vite.config.ts
export default {
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
};
```

2. **Image optimization:**
- Already using Sharp for resizing
- Serve WebP format when supported
- Use CDN for image delivery

### Database

```sql
-- Analyze and vacuum regularly
VACUUM ANALYZE;

-- Update statistics
ANALYZE photos;
```

## Security Hardening

### Backend

1. **Rate limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api', limiter);
```

2. **Helmet for security headers:**
```typescript
import helmet from 'helmet';
app.use(helmet());
```

3. **CORS configuration:**
```typescript
app.enableCors({
  origin: [process.env.FRONTEND_ADMIN_URL, process.env.FRONTEND_PUBLIC_URL],
  credentials: true,
});
```

### Database

```sql
-- Create read-only user for analytics
CREATE USER readonly WITH PASSWORD 'password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
```

### Nginx

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;

# Hide Nginx version
server_tokens off;

# File upload size limit
client_max_body_size 20M;
```

## Troubleshooting

### Common Issues

1. **Database connection failed:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U postgres -d miya_dairy_prod
```

2. **Port already in use:**
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

3. **Permission denied on uploads:**
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/uploads
sudo chmod -R 755 /var/www/uploads
```

4. **Out of memory:**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## Rollback Procedure

1. **Stop services:**
```bash
docker compose down
# or
pm2 stop miya-backend
```

2. **Restore database:**
```bash
# Restore from backup
gunzip < backup_20240120_020000.sql.gz | psql -h localhost -U postgres miya_dairy_prod
```

3. **Deploy previous version:**
```bash
git checkout <previous-commit>
npm run build
docker compose up -d
```

## Support

For deployment issues:
- Check logs first
- Review this guide
- Consult main README.md
- Open GitHub issue with logs
