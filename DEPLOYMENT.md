# Deployment Guide

This guide covers deploying the AI CV Screener application to various hosting platforms.

## 🚀 GitHub Pages (Recommended)

### Step 1: Prepare Your Repository
1. Create a new GitHub repository
2. Upload all project files to the repository
3. Ensure your repository structure looks like this:
   ```
   your-repo/
   ├── index.html
   ├── app.js
   ├── README.md
   ├── DEPLOYMENT.md
   └── sample_job_description.txt
   ```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Choose "main" branch (or your default branch)
6. Click "Save"

### Step 3: Access Your Application
- Your app will be available at: `https://yourusername.github.io/your-repo-name`
- It may take a few minutes for the first deployment to complete

## 🌐 Netlify

### Option 1: Drag & Drop
1. Go to [netlify.com](https://netlify.com)
2. Sign up or log in
3. Drag and drop your project folder to the deployment area
4. Your app will be deployed instantly

### Option 2: Git Integration
1. Connect your GitHub repository to Netlify
2. Netlify will automatically deploy when you push changes
3. You can set up custom domains and SSL certificates

## ⚡ Vercel

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
1. Navigate to your project directory
2. Run: `vercel`
3. Follow the prompts to deploy
4. Your app will be available at the provided URL

### Step 3: Connect to Git (Optional)
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Automatic deployments on every push

## ☁️ AWS S3

### Step 1: Create S3 Bucket
1. Go to AWS S3 Console
2. Create a new bucket with your desired name
3. Uncheck "Block all public access" (since this is a public website)
4. Enable "Static website hosting"

### Step 2: Upload Files
1. Upload all project files to the bucket
2. Set the index document to `index.html`

### Step 3: Configure Permissions
1. Go to bucket permissions
2. Add bucket policy for public read access:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### Step 4: Access Your Site
- Your site will be available at: `http://your-bucket-name.s3-website-region.amazonaws.com`

## 🔧 Custom Web Server

### Apache Configuration
1. Upload files to your web server
2. Ensure `.htaccess` file (if needed) allows access to all files
3. Set proper MIME types for JavaScript files

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/your/app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Considerations

### HTTPS Setup
- **GitHub Pages**: Automatically provides HTTPS
- **Netlify/Vercel**: Automatically provides HTTPS
- **Custom Server**: Install SSL certificate (Let's Encrypt recommended)

### CORS Configuration
- The application makes API calls to Anthropic's servers
- No special CORS configuration needed for client-side usage
- Ensure your hosting provider doesn't block external API calls

## 📱 Mobile Optimization

### Testing
- Test on various devices and screen sizes
- Use browser developer tools to simulate mobile devices
- Ensure touch interactions work properly

### Performance
- The application is optimized for mobile use
- File uploads work on mobile browsers
- Responsive design adapts to different screen sizes

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## 🐛 Troubleshooting Deployment

### Common Issues

**"Page not found" errors**
- Ensure `index.html` is in the root directory
- Check file permissions on your server
- Verify the deployment completed successfully

**"API calls failing"**
- Check if your hosting provider blocks external API calls
- Ensure HTTPS is properly configured
- Verify CORS settings if using a custom server

**"Files not loading"**
- Check file paths and case sensitivity
- Ensure all required files are uploaded
- Verify CDN resources are accessible

### Testing Your Deployment
1. Open your deployed application
2. Test API key configuration
3. Upload a test CV file
4. Verify analysis functionality
5. Test export features

## 📊 Monitoring

### Analytics (Optional)
- Add Google Analytics to track usage
- Monitor API usage in Anthropic Console
- Set up error tracking (e.g., Sentry)

### Performance Monitoring
- Use browser developer tools to check load times
- Monitor API response times
- Track user interactions and errors

## 🔄 Updates and Maintenance

### Updating the Application
1. Make changes to your local files
2. Test thoroughly
3. Push changes to your repository
4. Deployment will happen automatically (if using Git integration)

### Backup Strategy
- Keep local copies of all files
- Use version control (Git) for tracking changes
- Regular backups of any custom configurations

---

**Note**: Always test your deployment thoroughly before sharing with users. Consider setting up a staging environment for testing changes before deploying to production. 