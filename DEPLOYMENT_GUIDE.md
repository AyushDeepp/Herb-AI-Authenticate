# Complete Deployment Guide - Plant Identification System

## Prerequisites

Before deploying, ensure you have:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB database (local or cloud)
- Git

## Required API Keys

Obtain these API keys before deployment:

1. **Plant.id API Key**
   - Visit: https://plant.id/
   - Sign up and get your API key

2. **OpenWeatherMap API Key**
   - Visit: https://openweathermap.org/api
   - Sign up and get your free API key

3. **Google Gemini API Key**
   - Visit: https://ai.google.dev/
   - Sign up for Google AI Studio
   - Generate your API key

4. **Perplexity API Key** (Optional)
   - Visit: https://www.perplexity.ai/
   - Sign up and get your API key (format: `pplx-...`)

## Local Development Setup

### Step 1: Clone and Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Step 2: Configure Backend Environment

Edit `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/plant-identification
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plant-identification

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# API Keys
PLANT_API_KEY=your_plant_id_api_key
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### Step 3: Setup Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Step 4: Configure Frontend Environment

Edit `frontend/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_OPENWEATHER_API_KEY=your_openweather_api_key

# Development
VITE_NODE_ENV=development
```

### Step 5: Start Local Development

```bash
# Terminal 1: Start MongoDB (if using local MongoDB)
mongod

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

Your application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Production Deployment

### Option 1: Manual Server Deployment (VPS/Dedicated Server)

#### Step 1: Server Setup

```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install MongoDB (if using local MongoDB)
sudo apt-get install -y mongodb

# Install Nginx for reverse proxy
sudo apt-get install -y nginx

# Install SSL certificate tool
sudo apt-get install -y certbot python3-certbot-nginx
```

#### Step 2: Clone and Build Application

```bash
# Clone your repository
git clone https://github.com/yourusername/plant-identification.git
cd plant-identification

# Build Backend
cd backend
npm install --production
npm run build  # if you have a build script

# Build Frontend
cd ../frontend
npm install
npm run build
```

#### Step 3: Configure Production Environment

Create `backend/.env.production`:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/plant-identification
JWT_SECRET=your-super-secure-production-jwt-secret
PLANT_API_KEY=your_plant_id_api_key
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key
FRONTEND_URL=https://yourdomain.com
```

#### Step 4: Configure PM2

Create `ecosystem.config.js` in the backend directory:

```javascript
module.exports = {
  apps: [{
    name: 'plant-identification-backend',
    script: './server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/plant-identification`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    location / {
        root /path/to/plant-identification/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle large file uploads
    client_max_body_size 10M;
}
```

#### Step 6: Enable Site and SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/plant-identification /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Start application
cd /path/to/plant-identification/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Option 2: Heroku Deployment

#### Backend Deployment

1. **Prepare Backend for Heroku**

Create `backend/Procfile`:
```
web: node server.js
```

Add to `backend/package.json`:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

2. **Deploy Backend**

```bash
cd backend

# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set PLANT_API_KEY=your-plant-api-key
heroku config:set GEMINI_API_KEY=your-gemini-api-key
heroku config:set PERPLEXITY_API_KEY=your-perplexity-api-key
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
heroku config:set FRONTEND_URL=https://your-frontend-domain.com

# Deploy
git add .
git commit -m "Deploy backend"
git push heroku main
```

#### Frontend Deployment (Netlify/Vercel)

**For Netlify:**

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy to Netlify:
   - Go to netlify.com
   - Drag and drop the `dist` folder
   - Or connect your GitHub repository

3. Set environment variables in Netlify dashboard:
   - `VITE_API_URL=https://your-backend-app.herokuapp.com`
   - `VITE_OPENWEATHER_API_KEY=your-openweather-key`

**For Vercel:**

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_URL
vercel env add VITE_OPENWEATHER_API_KEY
```

### Option 3: Docker Deployment

#### Step 1: Create Docker Files

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Step 2: Create Docker Compose

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: plant-id-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    container_name: plant-id-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/plant-identification
      - JWT_SECRET=${JWT_SECRET}
      - PLANT_API_KEY=${PLANT_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    container_name: plant-id-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

#### Step 3: Deploy with Docker

```bash
# Create .env file with your API keys
echo "JWT_SECRET=your-jwt-secret" > .env
echo "PLANT_API_KEY=your-plant-api-key" >> .env
echo "GEMINI_API_KEY=your-gemini-api-key" >> .env
echo "PERPLEXITY_API_KEY=your-perplexity-api-key" >> .env

# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f
```

## Database Setup

### MongoDB Atlas (Cloud - Recommended)

1. **Create MongoDB Atlas Account**
   - Visit: https://www.mongodb.com/atlas
   - Sign up for free account

2. **Create Cluster**
   - Choose free tier (M0)
   - Select closest region
   - Create cluster

3. **Setup Database Access**
   - Create database user
   - Add your IP address to whitelist
   - Get connection string

4. **Use Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/plant-identification
   ```

### Local MongoDB

```bash
# Install MongoDB
# Ubuntu/Debian:
sudo apt-get install -y mongodb

# macOS:
brew install mongodb/brew/mongodb-community

# Start MongoDB
sudo systemctl start mongodb

# Enable auto-start
sudo systemctl enable mongodb
```

## Domain and SSL Setup

### Configure Domain

1. **Point domain to your server**
   - A Record: yourdomain.com → your-server-ip
   - CNAME: www.yourdomain.com → yourdomain.com

2. **Update environment variables**
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```

### SSL Certificate

```bash
# Using Certbot (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### Setup Monitoring

1. **PM2 Monitoring**
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart app
pm2 restart plant-identification-backend
```

2. **Nginx Monitoring**
```bash
# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Regular Maintenance

1. **Update Dependencies**
```bash
# Backend
cd backend
npm audit fix
npm update

# Frontend
cd frontend
npm audit fix
npm update
```

2. **Database Backup**
```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/plant-identification" --out=/backups/

# Restore backup
mongorestore --uri="mongodb://localhost:27017/plant-identification" /backups/plant-identification
```

3. **Server Updates**
```bash
sudo apt update && apt upgrade -y
sudo systemctl reboot
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check FRONTEND_URL in backend .env
   - Verify API_URL in frontend .env

2. **Database Connection Issues**
   - Check MongoDB URI
   - Verify database is running
   - Check firewall settings

3. **API Key Issues**
   - Verify all API keys are correct
   - Check API key permissions
   - Monitor API usage limits

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Review build logs for specific errors

### Performance Optimization

1. **Enable Gzip Compression**
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

2. **Setup Caching**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

3. **Database Indexing**
```javascript
// Add to your MongoDB
db.plants.createIndex({ "commonName": "text", "scientificName": "text" });
db.plants.createIndex({ "taxonomy.family": 1 });
db.plants.createIndex({ "conservation.status": 1 });
```

## Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Secure JWT secret key
- [ ] Enable CORS properly
- [ ] Validate all inputs
- [ ] Rate limit API endpoints
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Regular security audits

Your plant identification system is now ready for production deployment! Choose the deployment method that best fits your needs and infrastructure requirements. 