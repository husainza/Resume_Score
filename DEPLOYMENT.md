# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy the CV Screening Application to GitHub Pages with secure OpenAI API key management.

## 📋 Prerequisites

1. **GitHub Account**: You need a GitHub account
2. **OpenAI API Key**: A valid OpenAI API key (get one from [OpenAI Platform](https://platform.openai.com/))
3. **Git**: Git installed on your local machine

## 🔐 Security Setup

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `cv-screening-app` or `resume-analyzer`
3. Make it **public** (required for GitHub Pages)
4. Don't initialize with README (we'll push our files)

### Step 2: Set Up GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

```
Name: OPENAI_API_KEY
Value: sk-your-actual-openai-api-key-here
```

```
Name: OPENAI_MODEL
Value: gpt-4o-mini
```

```
Name: OPENAI_MAX_TOKENS
Value: 1000
```

```
Name: OPENAI_TEMPERATURE
Value: 0.1
```

### Step 3: Push Your Code

```bash
# Clone your repository
git clone https://github.com/yourusername/cv-screening-app.git
cd cv-screening-app

# Copy all your files to this directory
# (index.html, app.js, config.js, api-service.js, etc.)

# Add files to git
git add .

# Commit changes
git commit -m "Initial commit: CV Screening Application"

# Push to GitHub
git push origin main
```

## 🔧 GitHub Actions Setup

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that will:

1. **Automatically deploy** to GitHub Pages when you push to `main`
2. **Securely inject** your API key from GitHub Secrets
3. **Build and deploy** the application

### Workflow Features:

- ✅ **Secure API Key Management**: API keys are stored as GitHub Secrets
- ✅ **Automatic Deployment**: Deploys on every push to main branch
- ✅ **Environment Variables**: Configurable model, tokens, temperature
- ✅ **Error Handling**: Comprehensive error reporting
- ✅ **PR Comments**: Automatic comments on pull requests

## 🌐 Enable GitHub Pages

1. Go to your repository **Settings**
2. Scroll down to **Pages** section
3. Under **Source**, select **Deploy from a branch**
4. Select **gh-pages** branch
5. Click **Save**

Your app will be available at: `https://yourusername.github.io/cv-screening-app`

## 🔍 Verification Steps

### 1. Check GitHub Actions
1. Go to **Actions** tab in your repository
2. Verify the deployment workflow ran successfully
3. Check for any error messages

### 2. Test the Application
1. Visit your GitHub Pages URL
2. Click **Test Connection** button
3. Verify API connection works
4. Try uploading a sample CV

### 3. Check Console Logs
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for any error messages
4. Verify configuration is loaded correctly

## 🛠️ Troubleshooting

### Common Issues:

#### 1. API Key Not Working
- **Check**: GitHub Secrets are set correctly
- **Solution**: Re-add the secret with correct format
- **Verify**: Secret name matches exactly: `OPENAI_API_KEY`

#### 2. Deployment Fails
- **Check**: GitHub Actions logs
- **Solution**: Ensure all files are committed
- **Verify**: Repository is public

#### 3. 404 Error on GitHub Pages
- **Check**: GitHub Pages is enabled
- **Solution**: Wait 5-10 minutes for deployment
- **Verify**: Using correct branch (gh-pages)

#### 4. API Rate Limits
- **Check**: OpenAI account billing
- **Solution**: Upgrade plan or wait for reset
- **Verify**: API key has sufficient credits

## 🔄 Updating the Application

### For Code Changes:
```bash
# Make your changes
git add .
git commit -m "Update: description of changes"
git push origin main
```

### For API Key Changes:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Update the `OPENAI_API_KEY` secret
3. The next deployment will use the new key

## 📊 Monitoring

### GitHub Actions Dashboard
- Monitor deployment status
- View build logs
- Check for errors

### Application Monitoring
- Test API connection regularly
- Monitor usage costs
- Check for rate limits

## 🔒 Security Best Practices

1. **Never commit API keys** to the repository
2. **Use GitHub Secrets** for sensitive data
3. **Regularly rotate** API keys
4. **Monitor usage** to prevent abuse
5. **Set up alerts** for high usage

## 📈 Scaling Considerations

### For High Usage:
1. **Upgrade OpenAI Plan**: Higher rate limits
2. **Implement Caching**: Reduce API calls
3. **Add Rate Limiting**: Prevent abuse
4. **Monitor Costs**: Track usage patterns

### For Enterprise Use:
1. **Private Repository**: Enhanced security
2. **Custom Domain**: Professional branding
3. **CDN Integration**: Better performance
4. **Analytics**: Usage tracking

## 🎯 Next Steps

After successful deployment:

1. **Test thoroughly** with various CV formats
2. **Share the URL** with your team
3. **Monitor usage** and costs
4. **Gather feedback** for improvements
5. **Consider enhancements** like user authentication

## 📞 Support

If you encounter issues:

1. **Check GitHub Actions logs** for detailed error messages
2. **Review browser console** for client-side errors
3. **Verify API key** is working in OpenAI dashboard
4. **Check GitHub Pages** status page for service issues

---

**🎉 Congratulations!** Your CV Screening Application is now securely deployed on GitHub Pages with proper API key management. 