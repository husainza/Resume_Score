# AI CV Screener - Powered by OpenAI

A modern, client-side web application that automates CV screening and ranks candidates based on relevance to a provided job description using OpenAI's GPT models.

## 🚀 Features

### Core Functionality
- **Batch CV Processing**: Upload and analyze up to 200 CV files simultaneously
- **Multi-format Support**: Handles PDF, DOCX, and DOC files
- **AI-Powered Analysis**: Uses OpenAI GPT-4o-mini for intelligent candidate evaluation
- **Smart Ranking**: Automatically ranks candidates using a strict scoring system (0-100) with detailed evaluation criteria
- **Detailed Insights**: Extracts key information including name, role, company, duration, and education

### User Interface
- **Modern Design**: Clean, responsive UI built with Tailwind CSS
- **Drag & Drop**: Intuitive file upload with visual feedback
- **Interactive Results**: Sortable table with filtering and pagination
- **Real-time Analytics**: Score distribution charts and skills cloud visualization
- **Export Options**: Download results as CSV or JSON

### Advanced Features
- **Batch Processing**: Processes CVs in batches to respect API rate limits
- **Progress Tracking**: Real-time progress bar during analysis
- **Error Handling**: Graceful handling of file parsing and API errors
- **Local Storage**: API key stored securely in browser localStorage
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **AI Integration**: OpenAI API (GPT-4o-mini)
- **File Processing**: PDF.js (PDF parsing), Mammoth.js (DOCX parsing)
- **Charts**: Chart.js for data visualization
- **Icons**: Font Awesome
- **Deployment**: Static hosting (GitHub Pages, Netlify, Vercel, etc.)

## 📋 Prerequisites

1. **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys) and embed it in the code
2. **Modern Browser**: Chrome, Firefox, Safari, or Edge with JavaScript enabled
3. **Internet Connection**: Required for Claude API calls and CDN resources

## 🚀 Quick Start

### Option 1: Local Development
1. **Download the files** to your local machine
2. **Configure API Key**: Create a `config.js` file with your OpenAI API key
3. **Open `index.html`** in your web browser
4. **Start screening CVs!**

### Option 2: GitHub Pages Deployment (Recommended)
1. **Follow the [Deployment Guide](DEPLOYMENT.md)** for secure GitHub Pages deployment
2. **Set up GitHub Secrets** with your OpenAI API key
3. **Access your app** at `https://yourusername.github.io/your-repo-name`

### Option 3: Other Static Hosting
- **Netlify**: Drag and drop the folder to Netlify
- **Vercel**: Connect your repository to Vercel
- **AWS S3**: Upload files to S3 bucket with static website hosting
- **Any web server**: Upload files to your web server

## 📖 Usage Guide

### 1. Setup
1. **Configure API Key**: Open `app.js` and replace `'sk-your-openai-api-key-here'` with your actual OpenAI API key
2. Open the application in your browser
3. The application will automatically initialize with your embedded API key

### 2. Job Description
1. Enter the job title (optional but recommended)
2. Paste the job description in the text area
3. Alternatively, upload a JD file (TXT, DOC, DOCX, PDF)

### 3. Upload CVs
1. Drag and drop CV files onto the upload zone
2. Or click to browse and select files
3. Supported formats: PDF, DOCX, DOC
4. Maximum 200 files per session

### 4. Analysis
1. Click "Analyze CVs" to start processing
2. Monitor progress with the real-time progress bar
3. Results will appear automatically when complete

### 5. Review Results
1. View ranked candidates in the sortable table
2. Use filters to narrow down results by score or search terms
3. Click "View" to see detailed candidate information
4. Export results as CSV or JSON

## 🔧 Configuration

### API Key Setup
1. Open `app.js` in a text editor
2. Find the line: `const EMBEDDED_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';`
3. Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key
4. Save the file

Example:
```javascript
const EMBEDDED_API_KEY = 'sk-...'; // Your actual OpenAI API key here
```

### API Key Management
- API key is embedded directly in the code (`app.js`)
- Replace `'sk-your-openai-api-key-here'` with your actual OpenAI API key
- The key is never stored in browser localStorage
- Keep your API key secure and don't share the code publicly
- For production use, consider using environment variables or secure key management

### Batch Processing
- Default batch size: 5 CVs per batch
- 1-second delay between batches to respect rate limits
- Adjustable in the code if needed

### File Size Limits
- Maximum 200 files per session
- Individual file size limited by browser memory
- Recommended: Keep individual files under 10MB

## 📊 Understanding Results

### Relevance Score (0-100)
- **85-100**: Exceptional - Perfect match, significantly exceeds requirements
- **70-84**: Good - Meets most requirements with strong potential
- **55-69**: Fair - Meets some requirements, significant gaps present
- **35-54**: Poor - Meets few requirements, major gaps
- **0-34**: Very Poor - Does not meet requirements

The scoring system uses a strict evaluation framework that considers:
- **Role Match (30%)**: How closely the candidate's role matches the job title
- **Experience Relevance (25%)**: Years of experience in the exact field
- **Skills Match (20%)**: Alignment with required technical and soft skills
- **Education (15%)**: Educational background and field relevance
- **Achievements & Impact (10%)**: Demonstrated accomplishments and results

Additional deductions are applied for employment gaps, job hopping, missing certifications, and other red flags.

### Extracted Information
- **Name**: Full name of the candidate
- **Role**: Most recent job title/position
- **Company**: Most recent employer
- **Duration**: Time in current role
- **Education**: Highest education level achieved
- **Summary**: Key qualifications and experience
- **Rationale**: Detailed explanation of the score

## 🔒 Security & Privacy

### Data Handling
- All processing happens client-side
- CV content is sent to Claude API for analysis
- No data is stored on external servers
- API keys are stored locally in browser

### Privacy Considerations
- CV content is transmitted to Anthropic's servers for analysis
- Review Anthropic's privacy policy for data handling
- Consider data retention policies for your use case

## 🐛 Troubleshooting

### Common Issues

**"Failed to initialize OpenAI client"**
- Check that you've replaced `'sk-your-openai-api-key-here'` with your actual API key in `app.js`
- Verify your API key format (should start with `sk-`)
- Ensure you have an active OpenAI API subscription
- Verify internet connectivity

**"Analysis failed"**
- Check that your embedded OpenAI API key is valid and has sufficient quota
- Ensure job description is not empty
- Verify CV files are in supported formats

**"File upload issues"**
- Check file format (PDF, DOCX, DOC only)
- Ensure files are not corrupted
- Try smaller files if memory issues occur

**"Slow processing"**
- Reduce batch size in code if needed
- Check internet connection speed
- Consider processing fewer files at once

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📈 Performance Optimization

### For Large Batches
- Process in smaller batches (5-10 files)
- Use high-speed internet connection
- Close other browser tabs to free memory
- Consider using a desktop browser for large files

### API Rate Limits
- OpenAI API has rate limits per minute/hour
- Application includes built-in delays between batches
- Monitor your API usage in OpenAI Platform

## 🔄 Updates & Maintenance

### Keeping Updated
- Check for new versions of the application
- Update OpenAI API endpoints if needed
- Monitor OpenAI API changes

### Customization
- Modify prompts in `createAnalysisPrompt()` function
- Adjust scoring criteria in the prompt
- Customize UI styling with Tailwind classes
- Add new export formats as needed
- Update the embedded OpenAI API key in `app.js` when needed

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Clone the repository
2. Open `index.html` in a local server (to avoid CORS issues)
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure all prerequisites are met
4. Contact support with detailed error information

## 🎯 Roadmap

### Planned Features
- [ ] Support for more file formats
- [ ] Advanced filtering options
- [ ] Custom scoring criteria
- [ ] Team collaboration features
- [ ] Integration with ATS systems
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

### Known Limitations
- Requires internet connection for OpenAI API
- File processing limited by browser memory
- No server-side data persistence
- API rate limits apply

---

**Note**: This application is designed for educational and professional use. Always comply with relevant data protection and privacy regulations when processing candidate information. # Updated Tue Jul 29 18:25:11 EDT 2025
# Test workflow trigger - Tue Jul 29 18:28:45 EDT 2025
# Trigger workflow with improved debugging - Tue Jul 29 18:29:48 EDT 2025
# Fix Git authentication - Tue Jul 29 18:31:45 EDT 2025
# Test simplified deployment - Tue Jul 29 18:32:48 EDT 2025
