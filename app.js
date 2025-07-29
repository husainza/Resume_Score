// Global variables
let openaiClient = null;
let selectedFiles = [];
let analysisResults = [];
let currentPage = 1;
let itemsPerPage = 10;
let filteredResults = [];
let sortDirection = 'desc';
let currentSortField = 'score';

// Embedded API Key - Replace with your actual OpenAI API key
const EMBEDDED_API_KEY = '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'; // Replace this with your actual OpenAI API key

// OpenAI API Configuration
const OPENAI_CONFIG = {
    model: 'gpt-4o-mini', // Using GPT-4o-mini for cost-effectiveness and speed
    max_tokens: 1000,
    temperature: 0.1
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    initializeOpenAIClient();
});

function initializeApp() {
    // Set PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function setupEventListeners() {
    // File upload
    document.getElementById('dropZone').addEventListener('click', () => document.getElementById('cvFiles').click());
    document.getElementById('cvFiles').addEventListener('change', handleFileSelection);
    document.getElementById('jdFile').addEventListener('change', handleJDFileUpload);
    
    // Drag and drop
    setupDragAndDrop();
    
    // Action buttons
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCVs);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    
    // Export buttons
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
    document.getElementById('exportJson').addEventListener('click', exportToJSON);
    
    // Filters and sorting
    document.getElementById('scoreFilter').addEventListener('input', updateFilters);
    document.getElementById('searchFilter').addEventListener('input', updateFilters);
    document.getElementById('sortBy').addEventListener('change', updateFilters);
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // Modals
    document.getElementById('helpBtn').addEventListener('click', showHelpModal);
    document.getElementById('closeHelpModal').addEventListener('click', hideHelpModal);
    document.getElementById('closeModal').addEventListener('click', hideDetailModal);
    
    // Table sorting
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleTableSort(th.dataset.sort));
    });
}

// API Key Management
function initializeOpenAIClient() {
    try {
        if (!EMBEDDED_API_KEY || EMBEDDED_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
            showNotification('Please configure the embedded OpenAI API key in app.js', 'error');
            return;
        }
        
        // Validate API key format (OpenAI keys start with 'sk-')
        if (!EMBEDDED_API_KEY.startsWith('sk-')) {
            showNotification('Invalid OpenAI API key format. Keys should start with "sk-"', 'error');
            return;
        }
        
        openaiClient = true; // Simple flag to indicate API is configured
        updateAnalyzeButton();
        showNotification('OpenAI GPT initialized successfully', 'success');
    } catch (error) {
        console.error('Failed to initialize OpenAI client:', error);
        showNotification('Failed to initialize OpenAI client', 'error');
    }
}

// File Handling
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    handleFiles(files);
}

function handleJDFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById('jobDescription').value = content;
    };
    reader.readAsText(file);
}

function handleFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['.pdf', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        return validTypes.includes(fileExtension);
    });
    
    if (validFiles.length === 0) {
        showNotification('No valid files selected. Please upload PDF, DOC, or DOCX files.', 'error');
        return;
    }
    
    if (selectedFiles.length + validFiles.length > 200) {
        showNotification('Maximum 200 files allowed. Please remove some files first.', 'error');
        return;
    }
    
    selectedFiles = selectedFiles.concat(validFiles);
    updateFileList();
    updateAnalyzeButton();
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    const fileItems = document.getElementById('fileItems');
    
    if (selectedFiles.length === 0) {
        fileList.classList.add('hidden');
        return;
    }
    
    fileList.classList.remove('hidden');
    fileItems.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 bg-gray-50 rounded';
        fileItem.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-file-alt text-gray-400"></i>
                <span class="text-sm text-gray-700">${file.name}</span>
                <span class="text-xs text-gray-500">(${formatFileSize(file.size)})</span>
            </div>
            <button onclick="removeFile(${index})" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        fileItems.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateAnalyzeButton();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// CV Analysis
async function analyzeCVs() {
    if (!openaiClient) {
        showNotification('Please configure your OpenAI API key first', 'error');
        return;
    }
    
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();
    
    if (!jobDescription) {
        showNotification('Please enter a job description', 'error');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showNotification('Please select at least one CV file', 'error');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<div class="loading-spinner"></div><span>Analyzing...</span>';
    
    showProgress();
    
    try {
        analysisResults = [];
        const batchSize = 5; // Process in batches to avoid rate limits
        
        for (let i = 0; i < selectedFiles.length; i += batchSize) {
            const batch = selectedFiles.slice(i, i + batchSize);
            const batchPromises = batch.map(file => analyzeSingleCV(file, jobTitle, jobDescription));
            
            const batchResults = await Promise.all(batchPromises);
            analysisResults = analysisResults.concat(batchResults);
            
            updateProgress(i + batch.length, selectedFiles.length);
            
            // Small delay between batches to respect rate limits
            if (i + batchSize < selectedFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Sort results by score
        analysisResults.sort((a, b) => b.score - a.score);
        
        showResults();
        showNotification(`Analysis complete! Processed ${analysisResults.length} CVs.`, 'success');
        
    } catch (error) {
        console.error('Analysis failed:', error);
        showNotification('Analysis failed. Please check your API key and try again.', 'error');
    } finally {
        hideProgress();
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-play"></i><span>Analyze CVs</span>';
    }
}

async function analyzeSingleCV(file, jobTitle, jobDescription) {
    try {
        const cvText = await extractTextFromFile(file);
        
        const prompt = createAnalysisPrompt(jobTitle, jobDescription, cvText);
        
        const response = await callOpenAIAPI(prompt);
        
        const analysis = parseAnalysisResponse(response);
        
        return {
            fileName: file.name,
            ...analysis,
            cvText: cvText.substring(0, 500) + '...' // Store truncated text for details
        };
        
    } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
        return {
            fileName: file.name,
            name: 'Error',
            role: 'Error',
            company: 'Error',
            duration: 'Error',
            education: 'Error',
            score: 0,
            summary: 'Failed to analyze this CV',
            rationale: 'Analysis failed due to an error',
            cvText: ''
        };
    }
}

async function callOpenAIAPI(prompt) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${EMBEDDED_API_KEY}`
            },
            body: JSON.stringify({
                model: OPENAI_CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert HR recruiter analyzing CVs against job descriptions. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: OPENAI_CONFIG.max_tokens,
                temperature: OPENAI_CONFIG.temperature
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API call failed:', error);
        throw error;
    }
}

function createAnalysisPrompt(jobTitle, jobDescription, cvText) {
    return `You are a strict and experienced HR recruiter analyzing a CV against a job description. Be very critical and thorough in your evaluation. Only give high scores to candidates who truly excel.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

CV Content:
${cvText}

Please provide your analysis in the following JSON format only (no additional text or formatting):

{
  "name": "Full name of the candidate",
  "role": "Most recent job title/role",
  "company": "Most recent company name",
  "duration": "Time in current role (e.g., '2 years', '6 months')",
  "education": "Highest education level achieved",
  "score": 65,
  "summary": "Brief summary of key qualifications and experience",
  "rationale": "Detailed explanation of why this score was given, including specific strengths and weaknesses"
}

STRICT SCORING GUIDELINES (0-100):

95-100: EXCEPTIONAL - Perfect match, significantly exceeds all requirements, outstanding achievements
- Must have: Exact role match + 5+ years relevant experience + required education + exceptional achievements
- Examples: Senior-level candidates with proven track record in exact role

85-94: EXCELLENT - Meets all requirements with some exceeding expectations
- Must have: Very close role match + 3+ years relevant experience + required education + strong achievements
- Examples: Mid-senior candidates with solid experience in similar roles

70-84: GOOD - Meets most requirements, some gaps but strong potential
- Must have: Related role + 2+ years relevant experience + good education + some achievements
- Examples: Mid-level candidates with transferable skills

55-69: FAIR - Meets some requirements, significant gaps present
- Must have: Some relevant experience + basic education + limited achievements
- Examples: Junior candidates or those with partial skill match

35-54: POOR - Meets few requirements, major gaps
- Must have: Minimal relevant experience + basic education + no significant achievements
- Examples: Entry-level candidates or those with very different backgrounds

0-34: VERY POOR - Does not meet requirements
- Examples: Completely unrelated experience, no relevant skills, or major red flags

EVALUATION CRITERIA (be very strict):

1. ROLE MATCH (30% of score):
   - Exact title match: +15 points
   - Very similar role: +10 points
   - Related role: +5 points
   - Unrelated role: 0 points

2. EXPERIENCE RELEVANCE (25% of score):
   - 5+ years in exact field: +25 points
   - 3-4 years in exact field: +20 points
   - 2-3 years in exact field: +15 points
   - 1-2 years in exact field: +10 points
   - Less than 1 year: +5 points
   - No relevant experience: 0 points

3. SKILLS MATCH (20% of score):
   - All required skills present: +20 points
   - Most required skills present: +15 points
   - Some required skills present: +10 points
   - Few required skills present: +5 points
   - No required skills: 0 points

4. EDUCATION (15% of score):
   - Required degree + relevant field: +15 points
   - Required degree + different field: +10 points
   - Higher degree than required: +12 points
   - Lower degree than required: +5 points
   - No relevant education: 0 points

5. ACHIEVEMENTS & IMPACT (10% of score):
   - Exceptional achievements: +10 points
   - Good achievements: +7 points
   - Some achievements: +4 points
   - Basic achievements: +2 points
   - No significant achievements: 0 points

DEDUCTIONS (apply these to the final score):
- Missing required certifications: -10 points
- Employment gaps > 6 months: -5 points
- Job hopping (multiple jobs < 1 year): -10 points
- No relevant industry experience: -15 points
- Poor formatting/spelling errors: -5 points

IMPORTANT: Be very critical. Most candidates should score between 30-70. Only truly exceptional candidates should score above 80. If in doubt, score lower rather than higher.

Respond with ONLY the JSON object, no additional text or formatting.`;
}

function parseAnalysisResponse(responseText) {
    try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Validate and sanitize the response
        return {
            name: analysis.name || 'Unknown',
            role: analysis.role || 'Unknown',
            company: analysis.company || 'Unknown',
            duration: analysis.duration || 'Unknown',
            education: analysis.education || 'Unknown',
            score: Math.min(100, Math.max(0, parseInt(analysis.score) || 0)),
            summary: analysis.summary || 'No summary available',
            rationale: analysis.rationale || 'No rationale available'
        };
        
    } catch (error) {
        console.error('Failed to parse analysis response:', error);
        return {
            name: 'Parse Error',
            role: 'Unknown',
            company: 'Unknown',
            duration: 'Unknown',
            education: 'Unknown',
            score: 0,
            summary: 'Failed to parse analysis',
            rationale: 'Response parsing failed'
        };
    }
}

async function extractTextFromFile(file) {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === '.pdf') {
        return await extractTextFromPDF(file);
    } else if (fileExtension === '.docx' || fileExtension === '.doc') {
        return await extractTextFromDOCX(file);
    } else {
        throw new Error('Unsupported file format');
    }
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        text += pageText + '\n';
    }
    
    return text.trim();
}

async function extractTextFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
}

// UI Management
function showProgress() {
    document.getElementById('progressContainer').classList.remove('hidden');
    updateProgress(0, selectedFiles.length);
}

function hideProgress() {
    document.getElementById('progressContainer').classList.add('hidden');
}

function updateProgress(current, total) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = percentage + '%';
    progressText.textContent = `${current}/${total}`;
}

function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const hasApiKey = openaiClient !== null;
    const hasFiles = selectedFiles.length > 0;
    const hasJD = document.getElementById('jobDescription').value.trim().length > 0;
    
    analyzeBtn.disabled = !(hasApiKey && hasFiles && hasJD);
    
    // Update button text based on status
    if (!hasApiKey) {
        analyzeBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>API Not Configured</span>';
    } else if (!hasFiles) {
        analyzeBtn.innerHTML = '<i class="fas fa-upload"></i><span>Upload CVs First</span>';
    } else if (!hasJD) {
        analyzeBtn.innerHTML = '<i class="fas fa-file-text"></i><span>Add Job Description</span>';
    } else {
        analyzeBtn.innerHTML = '<i class="fas fa-play"></i><span>Analyze CVs</span>';
    }
}

function showResults() {
    filteredResults = [...analysisResults];
    currentPage = 1;
    
    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('analyticsSection').classList.remove('hidden');
    
    updateResultsTable();
    updateAnalytics();
    updatePagination();
}

function updateResultsTable() {
    const tbody = document.getElementById('resultsTable');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = filteredResults.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    pageResults.forEach((result, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 fade-in';
        
        const scoreColor = getScoreColor(result.score);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreColor}">
                        ${result.score}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${result.name}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.role}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.company}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.duration}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.education}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="showCandidateDetails(${startIndex + index})" class="text-blue-600 hover:text-blue-900">
                    <i class="fas fa-eye mr-1"></i>View
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function getScoreColor(score) {
    if (score >= 85) return 'bg-green-100 text-green-800'; // Exceptional
    if (score >= 70) return 'bg-blue-100 text-blue-800';   // Good
    if (score >= 55) return 'bg-yellow-100 text-yellow-800'; // Fair
    if (score >= 35) return 'bg-orange-100 text-orange-800'; // Poor
    return 'bg-red-100 text-red-800';                      // Very Poor
}

function getScoreRange(score) {
    if (score >= 85) return '85-100 (Exceptional)';
    if (score >= 70) return '70-84 (Good)';
    if (score >= 55) return '55-69 (Fair)';
    if (score >= 35) return '35-54 (Poor)';
    return '0-34 (Very Poor)';
}

function getScoreDescription(score) {
    if (score >= 85) return 'Perfect match, significantly exceeds requirements';
    if (score >= 70) return 'Meets most requirements with strong potential';
    if (score >= 55) return 'Meets some requirements, significant gaps present';
    if (score >= 35) return 'Meets few requirements, major gaps';
    return 'Does not meet requirements';
}

function getRecommendation(score) {
    if (score >= 85) return 'Strongly recommend for interview';
    if (score >= 70) return 'Recommend for interview';
    if (score >= 55) return 'Consider for interview if no better candidates';
    if (score >= 35) return 'Not recommended unless urgent need';
    return 'Do not consider';
}

function updateFilters() {
    const scoreFilter = parseInt(document.getElementById('scoreFilter').value);
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;
    
    // Update score filter display
    document.getElementById('scoreFilterValue').textContent = scoreFilter;
    
    // Apply filters
    filteredResults = analysisResults.filter(result => {
        const meetsScore = result.score >= scoreFilter;
        const meetsSearch = searchFilter === '' || 
            result.name.toLowerCase().includes(searchFilter) ||
            result.role.toLowerCase().includes(searchFilter) ||
            result.company.toLowerCase().includes(searchFilter) ||
            result.summary.toLowerCase().includes(searchFilter);
        
        return meetsScore && meetsSearch;
    });
    
    // Apply sorting
    sortResults(sortBy);
    
    currentPage = 1;
    updateResultsTable();
    updatePagination();
}

function sortResults(field) {
    filteredResults.sort((a, b) => {
        let aVal, bVal;
        
        switch (field) {
            case 'score':
                aVal = a.score;
                bVal = b.score;
                break;
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'role':
                aVal = a.role.toLowerCase();
                bVal = b.role.toLowerCase();
                break;
            case 'company':
                aVal = a.company.toLowerCase();
                bVal = b.company.toLowerCase();
                break;
            case 'education':
                aVal = a.education.toLowerCase();
                bVal = b.education.toLowerCase();
                break;
            default:
                aVal = a.score;
                bVal = b.score;
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return bVal - aVal; // Descending for scores
        } else {
            return aVal.localeCompare(bVal); // Ascending for strings
        }
    });
}

function handleTableSort(field) {
    if (currentSortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        sortDirection = 'desc';
    }
    
    document.getElementById('sortBy').value = field;
    updateFilters();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredResults.length);
    
    document.getElementById('startIndex').textContent = startIndex;
    document.getElementById('endIndex').textContent = endIndex;
    document.getElementById('totalResults').textContent = filteredResults.length;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateResultsTable();
        updatePagination();
    }
}

// Analytics
function updateAnalytics() {
    updateScoreChart();
    updateSkillsCloud();
}

function updateScoreChart() {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    
    // Create score distribution with new stricter ranges
    const scoreRanges = [
        { min: 85, max: 100, label: '85-100 (Exceptional)' },
        { min: 70, max: 84, label: '70-84 (Good)' },
        { min: 55, max: 69, label: '55-69 (Fair)' },
        { min: 35, max: 54, label: '35-54 (Poor)' },
        { min: 0, max: 34, label: '0-34 (Very Poor)' }
    ];
    
    const data = scoreRanges.map(range => {
        return filteredResults.filter(result => 
            result.score >= range.min && result.score <= range.max
        ).length;
    });
    
    const labels = scoreRanges.map(range => range.label);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Candidates',
                data: data,
                backgroundColor: [
                    '#10b981', '#3b82f6', '#f59e0b', 
                    '#f97316', '#ef4444', '#6b7280'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function updateSkillsCloud() {
    const skillsCloud = document.getElementById('skillsCloud');
    skillsCloud.innerHTML = '';
    
    // Extract skills from summaries (simple approach)
    const allText = filteredResults.map(r => r.summary + ' ' + r.role).join(' ').toLowerCase();
    const words = allText.match(/\b\w+\b/g) || [];
    
    const wordCount = {};
    words.forEach(word => {
        if (word.length > 3 && !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'just', 'into', 'than', 'more', 'other', 'about', 'many', 'then', 'them', 'these', 'people', 'only', 'would', 'could', 'there', 'their', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'her', 'if', 'will', 'up', 'one', 'all', 'there', 'no', 'new', 'work', 'first', 'may', 'such', 'give', 'over', 'think', 'also', 'around', 'another', 'came', 'come', 'work', 'three', 'word', 'because', 'does', 'part', 'even', 'place', 'well', 'here', 'must', 'big', 'high', 'such', 'follow', 'act', 'why', 'ask', 'men', 'change', 'went', 'light', 'kind', 'off', 'need', 'house', 'picture', 'try', 'us', 'again', 'animal', 'point', 'mother', 'world', 'near', 'build', 'self', 'earth', 'father', 'head', 'stand', 'own', 'page', 'should', 'country', 'found', 'answer', 'school', 'grow', 'study', 'still', 'learn', 'plant', 'cover', 'food', 'sun', 'four', 'between', 'state', 'keep', 'eye', 'never', 'last', 'let', 'thought', 'city', 'tree', 'cross', 'farm', 'hard', 'start', 'might', 'story', 'saw', 'far', 'sea', 'draw', 'left', 'late', 'run', 'don', 'while', 'press', 'close', 'night', 'real', 'life', 'few', 'north', 'book', 'carry', 'took', 'science', 'eat', 'room', 'friend', 'began', 'idea', 'fish', 'mountain', 'stop', 'once', 'base', 'hear', 'horse', 'cut', 'sure', 'watch', 'color', 'face', 'wood', 'main', 'open', 'seem', 'together', 'next', 'white', 'children', 'begin', 'got', 'walk', 'example', 'ease', 'paper', 'group', 'always', 'music', 'those', 'both', 'mark', 'often', 'letter', 'until', 'mile', 'river', 'car', 'feet', 'care', 'second', 'book', 'carry', 'took', 'science', 'eat', 'room', 'friend', 'began', 'idea', 'fish', 'mountain', 'stop', 'once', 'base', 'hear', 'horse', 'cut', 'sure', 'watch', 'color', 'face', 'wood', 'main', 'open', 'seem', 'together', 'next', 'white', 'children', 'begin', 'got', 'walk', 'example', 'ease', 'paper', 'group', 'always', 'music', 'those', 'both', 'mark', 'often', 'letter', 'until', 'mile', 'river', 'car', 'feet', 'care', 'second'].includes(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    });
    
    const sortedWords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);
    
    sortedWords.forEach(([word, count]) => {
        const tag = document.createElement('span');
        tag.className = 'inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium';
        tag.style.fontSize = `${Math.max(12, Math.min(20, 12 + count * 2))}px`;
        tag.textContent = word;
        skillsCloud.appendChild(tag);
    });
}

// Modal Management
function showCandidateDetails(index) {
    const candidate = filteredResults[index];
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="space-y-6">
            <div class="border-b pb-4">
                <h4 class="text-xl font-semibold text-gray-900">${candidate.name}</h4>
                <p class="text-gray-600">${candidate.role} at ${candidate.company}</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h5 class="font-medium text-gray-900 mb-2">Key Information</h5>
                    <div class="space-y-2 text-sm">
                        <div><span class="font-medium">Current Role:</span> ${candidate.role}</div>
                        <div><span class="font-medium">Company:</span> ${candidate.company}</div>
                        <div><span class="font-medium">Duration:</span> ${candidate.duration}</div>
                        <div><span class="font-medium">Education:</span> ${candidate.education}</div>
                        <div><span class="font-medium">Relevance Score:</span> 
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(candidate.score)}">
                                ${candidate.score}/100
                            </span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h5 class="font-medium text-gray-900 mb-2">Summary</h5>
                    <p class="text-sm text-gray-600">${candidate.summary}</p>
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-2">Analysis Rationale</h5>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-700">${candidate.rationale}</p>
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-2">Score Breakdown</h5>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="font-medium text-blue-800">Score Range: ${getScoreRange(candidate.score)}</p>
                            <p class="text-blue-700">${getScoreDescription(candidate.score)}</p>
                        </div>
                        <div>
                            <p class="font-medium text-blue-800">Recommendation:</p>
                            <p class="text-blue-700">${getRecommendation(candidate.score)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-2">CV Content Preview</h5>
                <div class="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    <p class="text-sm text-gray-700">${candidate.cvText}</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('detailModal').classList.remove('hidden');
}

function hideDetailModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

function showHelpModal() {
    document.getElementById('helpModal').classList.remove('hidden');
}

function hideHelpModal() {
    document.getElementById('helpModal').classList.add('hidden');
}

// Export Functions
function exportToCSV() {
    const headers = ['Score', 'Name', 'Role', 'Company', 'Duration', 'Education', 'Summary'];
    const csvContent = [
        headers.join(','),
        ...filteredResults.map(result => [
            result.score,
            `"${result.name}"`,
            `"${result.role}"`,
            `"${result.company}"`,
            `"${result.duration}"`,
            `"${result.education}"`,
            `"${result.summary.replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'cv_analysis_results.csv', 'text/csv');
}

function exportToJSON() {
    const jsonContent = JSON.stringify(filteredResults, null, 2);
    downloadFile(jsonContent, 'cv_analysis_results.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Utility Functions
function clearAll() {
    selectedFiles = [];
    analysisResults = [];
    filteredResults = [];
    currentPage = 1;
    
    document.getElementById('jobTitle').value = '';
    document.getElementById('jobDescription').value = '';
    document.getElementById('jdFile').value = '';
    document.getElementById('cvFiles').value = '';
    document.getElementById('searchFilter').value = '';
    document.getElementById('scoreFilter').value = 0;
    document.getElementById('scoreFilterValue').textContent = '0';
    
    updateFileList();
    updateAnalyzeButton();
    
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('analyticsSection').classList.add('hidden');
    
    showNotification('All data cleared', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm fade-in`;
    
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className += ` ${bgColor} text-white`;
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Input validation
document.getElementById('jobDescription').addEventListener('input', updateAnalyzeButton);
document.getElementById('jobTitle').addEventListener('input', updateAnalyzeButton); 