# Netlify + Render Deployment Guide

## Overview

This guide shows you how to deploy your Plant Identification System using:
- **Render** for the backend (Node.js API)
- **Netlify** for the frontend (React app)
- **MongoDB Atlas** for the database

This combination is cost-effective, reliable, and offers excellent performance.

## Prerequisites

- GitHub/GitLab account (for code repository)
- All required API keys ready

## Step 1: Prepare Your Repository

### 1.1 Create Repository Structure

Ensure your project structure looks like this:
```
plant-identification/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── ... (other backend files)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── ... (other frontend files)
└── README.md
```

### 1.2 Create Environment Examples

**Backend `.env.example`:**
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plant-identification
JWT_SECRET=your-super-secure-jwt-secret
PLANT_API_KEY=your_plant_id_api_key
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key
FRONTEND_URL=https://your-app-name.netlify.app
```

**Frontend `.env.example`:**
```env
VITE_API_URL=https://your-backend-app.onrender.com
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

### 1.3 Update Backend for Render

Create `backend/render.yaml` (optional but recommended):
```yaml
services:
  - type: web
    name: plant-identification-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### 1.4 Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit for deployment"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/plant-identification.git
git branch -M main
git push -u origin main
```

## Step 2: Setup MongoDB Atlas

### 2.1 Create Account and Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for free account
3. Create a new cluster (select Free tier M0)
4. Choose a region closest to your users

### 2.2 Configure Database Access

1. **Create Database User:**
   - Go to Database Access
   - Add New Database User
   - Choose password authentication
   - Set username and password
   - Give "Read and write to any database" permission

2. **Setup Network Access:**
   - Go to Network Access
   - Add IP Address
   - Choose "Allow access from anywhere" (0.0.0.0/0)
   - Or add specific IPs for better security

### 2.3 Get Connection String

1. Go to Clusters → Connect
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `myFirstDatabase` with `plant-identification`

Example: `mongodb+srv://username:password@cluster0.abc123.mongodb.net/plant-identification?retryWrites=true&w=majority`

## Step 3: Deploy Backend to Render

### 3.1 Create Render Account

1. Go to [Render](https://render.com)
2. Sign up with your GitHub account
3. This will give Render access to your repositories

### 3.2 Create Web Service

1. **Click "New +" → "Web Service"**
2. **Connect Repository:**
   - Select your plant-identification repository
   - Choose the main branch

3. **Configure Service:**
   ```
   Name: plant-identification-backend
   Region: Choose closest to your users
   Branch: main
   Root Directory: backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

### 3.3 Set Environment Variables

In the Render dashboard, go to Environment and add:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your-super-secure-jwt-secret-generate-a-long-random-string
PLANT_API_KEY=your_plant_id_api_key
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
FRONTEND_URL=https://your-app-name.netlify.app
```

**Important Notes:**
- Use a strong JWT_SECRET (at least 32 characters)
- Replace `your-app-name` with the actual Netlify app name you'll create
- Keep API keys secure and never commit them to git

### 3.4 Deploy

1. Click "Create Web Service"
2. Render will automatically deploy your backend
3. Wait for deployment to complete (usually 5-10 minutes)
4. Note your backend URL: `https://plant-identification-backend.onrender.com`

## Step 4: Deploy Frontend to Netlify

### 4.1 Create Netlify Account

1. Go to [Netlify](https://netlify.com)
2. Sign up with your GitHub account

### 4.2 Deploy from Git

1. **Click "New site from Git"**
2. **Choose Git Provider:** GitHub
3. **Select Repository:** plant-identification
4. **Configure Build Settings:**
   ```
   Branch: main
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/dist
   ```

### 4.3 Set Environment Variables

1. Go to Site Settings → Environment Variables
2. Add the following variables:

```
VITE_API_URL=https://your-backend-app.onrender.com
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

**Replace** `your-backend-app` with your actual Render service name.

### 4.4 Update Backend CORS

After getting your Netlify URL, update the backend environment:

1. Go to your Render dashboard
2. Update the `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-netlify-app-name.netlify.app
   ```
3. Redeploy the backend service

### 4.5 Custom Domain (Optional)

If you have a custom domain:

1. **In Netlify:**
   - Go to Domain Settings
   - Add custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables:**
   - Backend: Update `FRONTEND_URL` to your custom domain
   - Frontend: Update `VITE_API_URL` if needed

## Step 5: Verification and Testing

### 5.1 Test Your Deployment

1. **Visit your Netlify site**
2. **Test plant identification:**
   - Upload an image
   - Check if identification works
   - Verify all plant details are displayed

3. **Check browser console for errors**
4. **Test on mobile devices**

### 5.2 Monitor Logs

**Render Logs:**
- Go to your Render service dashboard
- Click on "Logs" to see backend logs

**Netlify Logs:**
- Go to your Netlify site dashboard
- Check "Functions" and "Deploy" logs

## Step 6: Continuous Deployment Setup

### 6.1 Auto-Deploy on Git Push

Both Render and Netlify automatically deploy when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "Your commit message"
git push origin main

# Both services will automatically redeploy
```

### 6.2 Environment-Specific Deployments

**For staging environment:**

1. **Create staging branch:**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. **Deploy staging versions:**
   - Create separate Render and Netlify services
   - Point to staging branch
   - Use different environment variables if needed

## Step 7: Production Optimizations

### 7.1 Render Optimizations

1. **Enable Health Checks:**
   - Add to your Express app:
   ```javascript
   app.get('/health', (req, res) => {
     res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
   });
   ```

2. **Add Request Logging:**
   ```javascript
   app.use((req, res, next) => {
     console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
     next();
   });
   ```

### 7.2 Netlify Optimizations

1. **Add _redirects file** in `frontend/public/_redirects`:
   ```
   /*    /index.html   200
   ```

2. **Add netlify.toml** in frontend root:
   ```toml
   [build]
     base = "frontend"
     command = "npm run build"
     publish = "dist"

   [build.environment]
     NODE_VERSION = "18"

   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-XSS-Protection = "1; mode=block"
       X-Content-Type-Options = "nosniff"
   ```

### 7.3 Performance Monitoring

1. **Add error tracking** (optional):
   ```bash
   npm install @sentry/node @sentry/react
   ```

2. **Monitor API usage** of external services
3. **Set up uptime monitoring** with services like UptimeRobot

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   ```javascript
   // In your backend app.js, ensure CORS is properly configured
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

2. **Build Failures on Netlify:**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Check build logs for specific errors

3. **Backend Not Responding:**
   - Check Render logs for errors
   - Verify environment variables are set
   - Ensure MongoDB connection is working

4. **API Key Issues:**
   - Verify all API keys are valid
   - Check usage limits
   - Ensure keys are properly set in environment

### Debugging Steps

1. **Check Service Status:**
   - Render: Dashboard shows service status
   - Netlify: Deploy logs show build status

2. **Test API Endpoints:**
   ```bash
   # Test backend health
   curl https://your-backend-app.onrender.com/health
   
   # Test plant identification endpoint
   curl -X POST https://your-backend-app.onrender.com/api/plants/identify
   ```

3. **Monitor Resource Usage:**
   - Render free tier: 512MB RAM, 0.1 CPU
   - Monitor for memory leaks or high CPU usage

## Cost Breakdown

### Free Tier Limits

**Render Free Tier:**
- 512MB RAM
- Shared CPU
- 500 build minutes/month
- Services spin down after 15 minutes of inactivity

**Netlify Free Tier:**
- 100GB bandwidth/month
- 300 build minutes/month
- Unlimited sites

**MongoDB Atlas Free Tier:**
- 512MB storage
- Shared RAM
- No credit card required

### Scaling Options

When you need more resources:

**Render:**
- Starter: $7/month (512MB RAM, always on)
- Standard: $25/month (2GB RAM)

**Netlify:**
- Pro: $19/month (1TB bandwidth)

## Security Best Practices

1. **Environment Variables:**
   - Never commit API keys to git
   - Use strong JWT secrets
   - Rotate API keys regularly

2. **CORS Configuration:**
   - Set specific frontend URL, avoid wildcards
   - Enable credentials only if needed

3. **Rate Limiting:**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

4. **Input Validation:**
   - Validate all inputs
   - Sanitize file uploads
   - Use proper error handling

Your Plant Identification System is now successfully deployed using Netlify + Render! This setup provides excellent performance, automatic scaling, and cost-effective hosting for your application. 