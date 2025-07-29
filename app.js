// Global variables
let openaiClient = null;
let selectedFiles = [];
let analysisResults = [];
let currentPage = 1;
let itemsPerPage = 10;
let filteredResults = [];
let sortDirection = 'desc';
let currentSortField = 'score';
let processedCache = new Map(); // Cache for processed CVs
let sessionId = Date.now().toString(); // Unique session ID
let jobPriorities = {}; // Extracted priorities from job description
let activeFilters = {
    skills: new Set(),
    experience: new Set(),
    education: new Set()
}; // Track active filters

// Initialize OpenAI Service
let openAIService;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupStep1EventListeners();
    initializeOpenAIService();
});

// Initialize OpenAI Service
function initializeOpenAIService() {
    try {
        // Validate configuration
        const configErrors = validateConfig();
        if (configErrors.length > 0) {
            console.error('Configuration errors:', configErrors);
            showNotification('Configuration errors: ' + configErrors.join(', '), 'error');
            return;
        }
        
        // Initialize OpenAI service
        openAIService = new OpenAIService();
        console.log('OpenAI Service initialized successfully');
        
        // Test connection
        testAPIConnection();
        
        // Add global test function for debugging
        window.testOpenAI = async function() {
            console.log('=== Manual API Test ===');
            try {
                const result = await openAIService.testConnection();
                console.log('✅ Manual test successful:', result);
                return result;
            } catch (error) {
                console.error('❌ Manual test failed:', error);
                return error;
            }
        };
        
    } catch (error) {
        console.error('Failed to initialize OpenAI service:', error);
        showNotification('Failed to initialize OpenAI service: ' + error.message, 'error');
    }
}

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
    document.getElementById('analyzeCVsBtn').addEventListener('click', analyzeCVs);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    
    // Export buttons
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
    document.getElementById('exportJson').addEventListener('click', exportToJSON);
    document.getElementById('exportDetailedReport').addEventListener('click', exportDetailedReport);
    
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
    
    // API Test
    document.getElementById('testApiBtn').addEventListener('click', testAPIConnection);
    
    // Table sorting
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleTableSort(th.dataset.sort));
    });
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Accessibility improvements
    setupAccessibility();
}

function setupStep1EventListeners() {
    console.log('Setting up Step 1 event listeners...');
    
    // Step 1: Job Analysis
    const analyzeJobBtn = document.getElementById('analyzeJobBtn');
    if (analyzeJobBtn) {
        console.log('Found analyzeJobBtn, adding event listener');
        analyzeJobBtn.addEventListener('click', analyzeJobDescription);
    } else {
        console.error('analyzeJobBtn not found!');
    }
    
    const proceedToStep2Btn = document.getElementById('proceedToStep2Btn');
    if (proceedToStep2Btn) {
        console.log('Found proceedToStep2Btn, adding event listener');
        proceedToStep2Btn.addEventListener('click', proceedToStep2);
    } else {
        console.error('proceedToStep2Btn not found!');
    }
    
    // Weight distribution inputs
    const weightInputs = ['roleMatchWeight', 'experienceWeight', 'skillsWeight', 'educationWeight', 'achievementsWeight'];
    weightInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateWeightTotal);
    });
    
    // Skills management
    document.getElementById('addSkillBtn').addEventListener('click', addNewSkill);
    document.getElementById('newSkillInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewSkill();
        }
    });
    
    // Industry and location selects
    document.getElementById('industrySelect').addEventListener('change', updateJobPriorities);
    document.getElementById('workLocationSelect').addEventListener('change', updateJobPriorities);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to analyze
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const analyzeCVsBtn = document.getElementById('analyzeCVsBtn');
            if (analyzeCVsBtn && !analyzeCVsBtn.disabled) {
                analyzeCVs();
            }
        }
        
        // Ctrl/Cmd + S to export CSV
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (filteredResults.length > 0) {
                exportToCSV();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            hideDetailModal();
            hideHelpModal();
        }
        
        // Arrow keys for pagination
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!document.getElementById('prevPage').disabled) {
                changePage(-1);
            }
        }
        if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!document.getElementById('nextPage').disabled) {
                changePage(1);
            }
        }
    });
}

function setupAccessibility() {
    // Add ARIA labels
    const analyzeCVsBtn = document.getElementById('analyzeCVsBtn');
    if (analyzeCVsBtn) {
        analyzeCVsBtn.setAttribute('aria-label', 'Analyze uploaded CVs');
    }
    document.getElementById('clearBtn').setAttribute('aria-label', 'Clear all data');
    document.getElementById('exportCsv').setAttribute('aria-label', 'Export results as CSV');
    document.getElementById('exportJson').setAttribute('aria-label', 'Export results as JSON');
    document.getElementById('exportDetailedReport').setAttribute('aria-label', 'Export detailed analysis report');
    
    // Add keyboard navigation to table
    const tableRows = document.querySelectorAll('#resultsTable tr');
    tableRows.forEach(row => {
        row.setAttribute('tabindex', '0');
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const viewButton = row.querySelector('button');
                if (viewButton) {
                    viewButton.click();
                }
            }
        });
    });
}

// API Key Management
function initializeOpenAIClient() {
    try {
        const apiKey = getApiKey();
        console.log('Initializing OpenAI client...');
        console.log('API Key retrieved:', apiKey ? 'Yes' : 'No');
        
        if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
            console.log('No valid API key found');
            showNotification('Please configure your OpenAI API key in the code.', 'error');
            return;
        }
        
        // Validate API key format (OpenAI keys start with 'sk-')
        if (!apiKey.startsWith('sk-')) {
            showNotification('Invalid OpenAI API key format. Please check your embedded API key.', 'error');
            return;
        }
        
        openaiClient = true; // Simple flag to indicate API is configured
        updateAnalyzeButton();
        
        // Test API connection
        testAPIConnection();
        
    } catch (error) {
        console.error('Failed to initialize OpenAI client:', error);
        showNotification('Failed to initialize OpenAI client', 'error');
    }
}



// Extract priorities from job description
async function extractJobPriorities(jobTitle, jobDescription) {
    try {
        console.log('Extracting priorities from job description...');
        console.log('Job title:', jobTitle);
        console.log('Job description length:', jobDescription.length);
        
        if (!openAIService) {
            throw new Error('OpenAI service not initialized');
        }
        
        const priorities = await openAIService.extractJobPriorities(jobTitle, jobDescription);
        jobPriorities = priorities;
        console.log('Extracted job priorities:', jobPriorities);
        return priorities;
        
    } catch (error) {
        console.error('Error extracting job priorities:', error);
        throw error; // Re-throw to be handled by caller
    }
}

// Update job requirements summary
function updateJobRequirementsSummary(priorities) {
    const summarySection = document.getElementById('jobRequirementsSummary');
    if (!summarySection) return;
    
    summarySection.classList.remove('hidden');
    
    // Update industry
    const industryValue = document.getElementById('industryValue');
    if (industryValue) {
        industryValue.textContent = priorities.industry || 'Not specified';
    }
    
    // Update skills
    const skillsValue = document.getElementById('skillsValue');
    if (skillsValue && priorities.required_skills) {
        skillsValue.textContent = priorities.required_skills.length + ' required';
    }
    
    // Update experience priority
    const experienceValue = document.getElementById('experienceValue');
    if (experienceValue) {
        const priority = priorities.experience_priority || 'medium';
        experienceValue.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    }
    
    // Update education priority
    const educationValue = document.getElementById('educationValue');
    if (educationValue) {
        const priority = priorities.education_priority || 'medium';
        educationValue.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    }
}

// Create dynamic filters based on job priorities
function createDynamicFilters(priorities) {
    // Create skill filters
    if (priorities.required_skills && priorities.required_skills.length > 0) {
        createSkillFilters(priorities.required_skills);
    }
    
    // Create experience filters
    createExperienceFilters();
    
    // Create education filters
    createEducationFilters();
}

// Create skill filter buttons
function createSkillFilters(skills) {
    const skillFilters = document.getElementById('skillFilters');
    const skillFilterButtons = document.getElementById('skillFilterButtons');
    
    if (!skillFilters || !skillFilterButtons) return;
    
    skillFilters.classList.remove('hidden');
    skillFilterButtons.innerHTML = '';
    
    skills.forEach(skill => {
        const button = document.createElement('button');
        button.className = 'px-3 py-1 text-sm border border-blue-300 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 filter-btn';
        button.textContent = skill;
        button.dataset.filter = 'skill';
        button.dataset.value = skill;
        
        button.addEventListener('click', () => {
            button.classList.toggle('bg-blue-600');
            button.classList.toggle('text-white');
            button.classList.toggle('border-blue-600');
            
            if (button.classList.contains('bg-blue-600')) {
                activeFilters.skills.add(skill);
            } else {
                activeFilters.skills.delete(skill);
            }
            
            updateFilters();
        });
        
        skillFilterButtons.appendChild(button);
    });
}

// Create experience filter buttons
function createExperienceFilters() {
    const experienceFilters = document.getElementById('experienceFilters');
    const experienceFilterButtons = document.getElementById('experienceFilterButtons');
    
    if (!experienceFilters || !experienceFilterButtons) return;
    
    experienceFilters.classList.remove('hidden');
    experienceFilterButtons.innerHTML = '';
    
    const experienceLevels = [
        { label: 'Entry Level', value: 'entry' },
        { label: 'Mid Level', value: 'mid' },
        { label: 'Senior Level', value: 'senior' },
        { label: 'Executive', value: 'executive' }
    ];
    
    experienceLevels.forEach(level => {
        const button = document.createElement('button');
        button.className = 'px-3 py-1 text-sm border border-green-300 rounded-full hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 filter-btn';
        button.textContent = level.label;
        button.dataset.filter = 'experience';
        button.dataset.value = level.value;
        
        button.addEventListener('click', () => {
            button.classList.toggle('bg-green-600');
            button.classList.toggle('text-white');
            button.classList.toggle('border-green-600');
            
            if (button.classList.contains('bg-green-600')) {
                activeFilters.experience.add(level.value);
            } else {
                activeFilters.experience.delete(level.value);
            }
            
            updateFilters();
        });
        
        experienceFilterButtons.appendChild(button);
    });
}

// Create education filter buttons
function createEducationFilters() {
    const educationFilters = document.getElementById('educationFilters');
    const educationFilterButtons = document.getElementById('educationFilterButtons');
    
    if (!educationFilters || !educationFilterButtons) return;
    
    educationFilters.classList.remove('hidden');
    educationFilterButtons.innerHTML = '';
    
    const educationLevels = [
        { label: 'High School', value: 'high_school' },
        { label: 'Bachelor\'s', value: 'bachelors' },
        { label: 'Master\'s', value: 'masters' },
        { label: 'PhD', value: 'phd' }
    ];
    
    educationLevels.forEach(level => {
        const button = document.createElement('button');
        button.className = 'px-3 py-1 text-sm border border-purple-300 rounded-full hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 filter-btn';
        button.textContent = level.label;
        button.dataset.filter = 'education';
        button.dataset.value = level.value;
        
        button.addEventListener('click', () => {
            button.classList.toggle('bg-purple-600');
            button.classList.toggle('text-white');
            button.classList.toggle('border-purple-600');
            
            if (button.classList.contains('bg-purple-600')) {
                activeFilters.education.add(level.value);
            } else {
                activeFilters.education.delete(level.value);
            }
            
            updateFilters();
        });
        
        educationFilterButtons.appendChild(button);
    });
}

// Step 1: Analyze job description
async function analyzeJobDescription() {
    console.log('analyzeJobDescription function called');
    
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();
    
    console.log('Job title:', jobTitle);
    console.log('Job description length:', jobDescription.length);
    
    if (!jobTitle || !jobDescription) {
        showNotification('Please enter both job title and description', 'error');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeJobBtn');
    const progressContainer = document.getElementById('jobAnalysisProgress');
    const progressBar = document.getElementById('jobAnalysisProgressBar');
    const statusText = document.getElementById('jobAnalysisStatus');
    
    // Show progress and disable button
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
    progressContainer.classList.remove('hidden');
    
    try {
        // Update progress
        updateJobAnalysisProgress(20, 'Initializing analysis...');
        showNotification('Analyzing job description...', 'info');
        
        // Simulate progress updates
        setTimeout(() => updateJobAnalysisProgress(40, 'Extracting job requirements...'), 500);
        setTimeout(() => updateJobAnalysisProgress(60, 'Identifying key skills...'), 1000);
        setTimeout(() => updateJobAnalysisProgress(80, 'Setting scoring parameters...'), 1500);
        
        const priorities = await extractJobPriorities(jobTitle, jobDescription);
        
        updateJobAnalysisProgress(100, 'Analysis complete!');
        
        console.log('Job priorities extracted successfully:', priorities);
        showNotification('Job analysis complete!', 'success');
        
        // Populate the scoring parameters
        populateScoringParameters(priorities);
        
        // Show the results section
        document.getElementById('jobAnalysisResults').classList.remove('hidden');
        
        // Update job priorities global variable
        jobPriorities = priorities;
        
        // Hide progress after a short delay
        setTimeout(() => {
            progressContainer.classList.add('hidden');
        }, 1000);
    } catch (error) {
        console.error('Error analyzing job description:', error);
        showNotification('Error analyzing job description: ' + error.message, 'error');
        progressContainer.classList.add('hidden');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Analyze Job Description';
    }
}

// Update job analysis progress
function updateJobAnalysisProgress(percentage, status) {
    const progressBar = document.getElementById('jobAnalysisProgressBar');
    const statusText = document.getElementById('jobAnalysisStatus');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    if (statusText) {
        statusText.textContent = status;
    }
}

// Download CV function
function downloadCV(index) {
    const result = filteredResults[index];
    if (!result || !result.file) {
        showNotification('CV file not available for download', 'error');
        return;
    }
    
    // Create a download link for the original file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(result.file);
    link.download = result.file.name;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Downloading ${result.file.name}`, 'success');
}

// Populate scoring parameters from job analysis
function populateScoringParameters(priorities) {
    // Set weights based on priorities
    if (priorities.experience_priority === 'high') {
        document.getElementById('experienceWeight').value = 30;
        document.getElementById('roleMatchWeight').value = 25;
        document.getElementById('skillsWeight').value = 20;
        document.getElementById('educationWeight').value = 20;
        document.getElementById('achievementsWeight').value = 5;
    } else if (priorities.education_priority === 'high') {
        document.getElementById('educationWeight').value = 30;
        document.getElementById('roleMatchWeight').value = 25;
        document.getElementById('experienceWeight').value = 20;
        document.getElementById('skillsWeight').value = 20;
        document.getElementById('achievementsWeight').value = 5;
    } else {
        // Default weights
        document.getElementById('roleMatchWeight').value = 30;
        document.getElementById('experienceWeight').value = 25;
        document.getElementById('skillsWeight').value = 20;
        document.getElementById('educationWeight').value = 20;
        document.getElementById('achievementsWeight').value = 5;
    }
    
    updateWeightTotal();
    
    // Populate required skills
    const skillsContainer = document.getElementById('requiredSkillsContainer');
    skillsContainer.innerHTML = '';
    
    if (priorities.required_skills && priorities.required_skills.length > 0) {
        priorities.required_skills.forEach(skill => {
            addSkillTag(skill);
        });
    }
    
    // Set industry if detected
    if (priorities.industry) {
        const industrySelect = document.getElementById('industrySelect');
        const industryValue = priorities.industry.toLowerCase();
        
        if (industryValue.includes('mrna') || industryValue.includes('biotech')) {
            industrySelect.value = 'mRNA';
        } else if (industryValue.includes('software') || industryValue.includes('tech')) {
            industrySelect.value = 'software';
        } else if (industryValue.includes('finance')) {
            industrySelect.value = 'finance';
        } else if (industryValue.includes('healthcare')) {
            industrySelect.value = 'healthcare';
        } else if (industryValue.includes('manufacturing')) {
            industrySelect.value = 'manufacturing';
        } else {
            industrySelect.value = 'other';
        }
    }
}

// Update weight total
function updateWeightTotal() {
    const weights = [
        'roleMatchWeight',
        'experienceWeight', 
        'skillsWeight',
        'educationWeight',
        'achievementsWeight'
    ];
    
    const total = weights.reduce((sum, id) => {
        return sum + (parseInt(document.getElementById(id).value) || 0);
    }, 0);
    
    document.getElementById('weightTotal').textContent = total;
    
    // Highlight if not 100%
    const totalElement = document.getElementById('weightTotal');
    if (total !== 100) {
        totalElement.className = 'text-red-500 font-semibold';
    } else {
        totalElement.className = 'text-gray-500';
    }
}

// Add new skill
function addNewSkill() {
    const input = document.getElementById('newSkillInput');
    const skill = input.value.trim();
    
    if (skill) {
        addSkillTag(skill);
        input.value = '';
    }
}

// Add skill tag
function addSkillTag(skill) {
    const container = document.getElementById('requiredSkillsContainer');
    const skillTag = document.createElement('div');
    skillTag.className = 'flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm';
    skillTag.innerHTML = `
        <span>${skill}</span>
        <button onclick="removeSkillTag(this)" class="text-blue-600 hover:text-blue-800">
            <i class="fas fa-times text-xs"></i>
        </button>
    `;
    container.appendChild(skillTag);
}

// Remove skill tag
function removeSkillTag(button) {
    button.parentElement.remove();
}

// Update job priorities from form
function updateJobPriorities() {
    const industry = document.getElementById('industrySelect').value;
    const workLocation = document.getElementById('workLocationSelect').value;
    
    if (industry) {
        jobPriorities.industry = industry;
    }
    if (workLocation) {
        jobPriorities.work_location = workLocation;
    }
}

// Proceed to step 2
function proceedToStep2() {
    // Validate weights
    const total = parseInt(document.getElementById('weightTotal').textContent);
    if (total !== 100) {
        showNotification('Please ensure weights total 100%', 'error');
        return;
    }
    
    // Get all skills
    const skillTags = document.querySelectorAll('#requiredSkillsContainer div');
    const skills = Array.from(skillTags).map(tag => tag.querySelector('span').textContent);
    
    // Update job priorities with form data
    jobPriorities.required_skills = skills;
    jobPriorities.industry = document.getElementById('industrySelect').value;
    jobPriorities.work_location = document.getElementById('workLocationSelect').value;
    
    // Hide step 1, show step 2
    document.getElementById('step1Section').classList.add('hidden');
    document.getElementById('step2Section').classList.remove('hidden');
    
    showNotification('Ready to upload CVs!', 'success');
}

// Test API connection
async function testAPIConnection() {
    try {
        console.log('Testing API connection...');
        
        if (!openAIService) {
            showNotification('❌ OpenAI service not initialized', 'error');
            return false;
        }
        
        showNotification('Testing API connection...', 'info');
        
        const success = await openAIService.testConnection();
        
        if (success) {
            console.log('API connection test successful');
            showNotification('✅ API connection verified successfully!', 'success');
            return true;
        } else {
            console.log('API connection test failed');
            showNotification('❌ API connection test failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('API connection test failed:', error);
        
        // Provide specific error messages
        let errorMessage = 'API test failed: ';
        if (error.message.includes('401')) {
            errorMessage += 'Invalid API key. Please check your OpenAI API key.';
        } else if (error.message.includes('429')) {
            errorMessage += 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('insufficient_quota')) {
            errorMessage += 'Insufficient quota. Please check your OpenAI account billing.';
        } else {
            errorMessage += error.message;
        }
        
        showNotification(errorMessage, 'error');
        return false;
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
        
        // Check file type
        if (!validTypes.includes(fileExtension)) {
            return false;
        }
        
        // Check file size (max 10MB per file)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showNotification(`File ${file.name} is too large. Maximum size is 10MB.`, 'error');
            return false;
        }
        
        return true;
    });
    
    if (validFiles.length === 0) {
        showNotification('No valid files selected. Please upload PDF, DOC, or DOCX files under 10MB.', 'error');
        return;
    }
    
    if (selectedFiles.length + validFiles.length > 200) {
        showNotification('Maximum 200 files allowed. Please remove some files first.', 'error');
        return;
    }
    
    // Check for duplicate files
    const newFiles = validFiles.filter(file => 
        !selectedFiles.some(existing => existing.name === file.name && existing.size === file.size)
    );
    
    if (newFiles.length < validFiles.length) {
        showNotification(`${validFiles.length - newFiles.length} duplicate files were skipped.`, 'warning');
    }
    
    selectedFiles = selectedFiles.concat(newFiles);
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
    console.log('Starting CV analysis...');
    console.log('OpenAI client status:', openaiClient);
    console.log('Selected files:', selectedFiles.length);
    
    if (!openaiClient) {
        showNotification('Please configure your OpenAI API key first', 'error');
        return;
    }
    
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();
    
    console.log('Job title:', jobTitle);
    console.log('Job description length:', jobDescription.length);
    
    if (!jobDescription) {
        showNotification('Please enter a job description', 'error');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showNotification('Please select at least one CV file', 'error');
        return;
    }
    
    const analyzeCVsBtn = document.getElementById('analyzeCVsBtn');
    analyzeCVsBtn.disabled = true;
    analyzeCVsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
    
    showProgress();
    
    try {
        // First, extract job priorities from the job description
        console.log('Extracting job priorities...');
        showNotification('Analyzing job requirements...', 'info');
        
        const priorities = await extractJobPriorities(jobTitle, jobDescription);
        if (priorities) {
            console.log('Job priorities extracted successfully:', priorities);
            showNotification('Job requirements analyzed successfully!', 'success');
            updateJobRequirementsSummary(priorities);
            createDynamicFilters(priorities);
        } else {
            console.log('Failed to extract job priorities, using default scoring');
            showNotification('Using default scoring criteria', 'warning');
        }
        
        analysisResults = [];
        const batchSize = 5; // Process in batches to avoid rate limits
        
        console.log(`Processing ${selectedFiles.length} files in batches of ${batchSize}`);
        
        for (let i = 0; i < selectedFiles.length; i += batchSize) {
            const batch = selectedFiles.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}, files:`, batch.map(f => f.name));
            
            const batchPromises = batch.map(file => analyzeSingleCV(file, jobTitle, jobDescription));
            
            const batchResults = await Promise.all(batchPromises);
            console.log('Batch results:', batchResults);
            
            analysisResults = analysisResults.concat(batchResults);
            
            updateProgress(i + batch.length, selectedFiles.length);
            
            // Small delay between batches to respect rate limits
            if (i + batchSize < selectedFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('All analysis results:', analysisResults);
        
        // Sort results by score
        analysisResults.sort((a, b) => b.score - a.score);
        
        console.log('Sorted results:', analysisResults);
        
        showResults();
        showNotification(`Analysis complete! Processed ${analysisResults.length} CVs.`, 'success');
        
    } catch (error) {
        console.error('Analysis failed:', error);
        showNotification(`Analysis failed: ${error.message}`, 'error');
    } finally {
        hideProgress();
        analyzeCVsBtn.disabled = false;
        analyzeCVsBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Analyze CVs';
    }
}

async function analyzeSingleCV(file, jobTitle, jobDescription) {
    console.log(`Analyzing CV: ${file.name}`);
    
    try {
        console.log(`Extracting text from ${file.name}...`);
        const cvText = await extractTextFromFile(file);
        console.log(`Extracted ${cvText.length} characters from ${file.name}`);
        
        if (!openAIService) {
            throw new Error('OpenAI service not initialized');
        }
        
        console.log(`Calling OpenAI API for ${file.name}...`);
        const analysis = await openAIService.analyzeCV(jobTitle, jobDescription, cvText, jobPriorities);
        console.log(`Received analysis for ${file.name}:`, analysis);
        
        const result = {
            fileName: file.name,
            file: file, // Store the file object for download
            ...analysis,
            cvText: cvText.substring(0, 500) + '...' // Store truncated text for details
        };
        
        console.log(`Final result for ${file.name}:`, result);
        return result;
        
    } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
        const errorResult = {
            fileName: file.name,
            name: `Error - ${file.name}`,
            role: 'Analysis Failed',
            company: 'N/A',
            duration: 'N/A',
            education: 'N/A',
            score: 0,
            summary: `Failed to analyze this CV: ${error.message}`,
            rationale: `Analysis failed due to an error: ${error.message}`,
            cvText: ''
        };
        console.log(`Error result for ${file.name}:`, errorResult);
        return errorResult;
    }
}

async function callOpenAIAPI(prompt) {
    try {
        const EMBEDDED_API_KEY = getApiKey();
        console.log('=== OpenAI API Call Debug ===');
        console.log('API Key available:', EMBEDDED_API_KEY ? 'Yes' : 'No');
        console.log('API Key starts with sk-:', EMBEDDED_API_KEY?.startsWith('sk-'));
        console.log('API Key starts with sk-proj--:', EMBEDDED_API_KEY?.startsWith('sk-proj--'));
        console.log('API Key length:', EMBEDDED_API_KEY?.length);
        console.log('API Key type:', EMBEDDED_API_KEY?.startsWith('sk-proj--') ? 'Project-based' : 'Standard');
        console.log('Model being used:', OPENAI_CONFIG.model);
        console.log('Prompt length:', prompt.length);
        
        const requestBody = {
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
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        console.log('Making OpenAI API request...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${EMBEDDED_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response status text:', response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            
            // Try to parse error as JSON for better error messages
            try {
                const errorJson = JSON.parse(errorText);
                console.error('Parsed error JSON:', errorJson);
                
                if (errorJson.error) {
                    throw new Error(`OpenAI API Error: ${errorJson.error.type} - ${errorJson.error.message}`);
                } else {
                    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
                }
            } catch (parseError) {
                throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }
        }

        const data = await response.json();
        console.log('Success response data:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response structure from OpenAI API');
        }
        
        const content = data.choices[0].message.content;
        console.log('Extracted content:', content);
        console.log('=== End OpenAI API Call Debug ===');
        
        return content;
    } catch (error) {
        console.error('OpenAI API call failed:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

function createAnalysisPrompt(jobTitle, jobDescription, cvText) {
    // Build dynamic scoring criteria based on extracted job priorities
    let scoringCriteria = '';
    let deductions = '';
    let bonusFactors = '';
    
    if (jobPriorities && Object.keys(jobPriorities).length > 0) {
        console.log('Using extracted job priorities for dynamic scoring');
        
        // Get weights from form inputs (user-defined)
        const weights = {
            roleMatch: parseInt(document.getElementById('roleMatchWeight').value) || 30,
            experienceRelevance: parseInt(document.getElementById('experienceWeight').value) || 25,
            skillsMatch: parseInt(document.getElementById('skillsWeight').value) || 20,
            education: parseInt(document.getElementById('educationWeight').value) || 20,
            achievements: parseInt(document.getElementById('achievementsWeight').value) || 5
        };
        
        scoringCriteria = `
DYNAMIC SCORING CRITERIA (based on job requirements):

1. ROLE MATCH (${weights.roleMatch}% of score):
   - Exact title match: +${weights.roleMatch} points
   - Very similar role: +${Math.floor(weights.roleMatch * 0.7)} points
   - Related role: +${Math.floor(weights.roleMatch * 0.3)} points
   - Unrelated role: 0 points

2. EXPERIENCE RELEVANCE (${weights.experienceRelevance}% of score):
   - 5+ years in exact field: +${weights.experienceRelevance} points
   - 3-4 years in exact field: +${Math.floor(weights.experienceRelevance * 0.8)} points
   - 2-3 years in exact field: +${Math.floor(weights.experienceRelevance * 0.6)} points
   - 1-2 years in exact field: +${Math.floor(weights.experienceRelevance * 0.4)} points
   - Less than 1 year: +${Math.floor(weights.experienceRelevance * 0.2)} points
   - No relevant experience: 0 points

3. SKILLS MATCH (${weights.skillsMatch}% of score):
   - All required skills present: +${weights.skillsMatch} points
   - Most required skills present: +${Math.floor(weights.skillsMatch * 0.75)} points
   - Some required skills present: +${Math.floor(weights.skillsMatch * 0.5)} points
   - Few required skills present: +${Math.floor(weights.skillsMatch * 0.25)} points
   - No required skills: 0 points
   
   Required skills to check: ${jobPriorities.required_skills ? jobPriorities.required_skills.join(', ') : 'None specified'}

4. EDUCATION (${weights.education}% of score):
   - Required degree + relevant field: +${weights.education} points
   - Required degree + different field: +${Math.floor(weights.education * 0.7)} points
   - Higher degree than required: +${Math.floor(weights.education * 0.8)} points
   - Lower degree than required: +${Math.floor(weights.education * 0.3)} points
   - No relevant education: 0 points

5. ACHIEVEMENTS & IMPACT (${weights.achievements}% of score):
   - Exceptional achievements: +${weights.achievements} points
   - Good achievements: +${Math.floor(weights.achievements * 0.7)} points
   - Some achievements: +${Math.floor(weights.achievements * 0.4)} points
   - Basic achievements: +${Math.floor(weights.achievements * 0.2)} points
   - No significant achievements: 0 points`;

        // Dynamic deductions based on job requirements
        deductions = `
DYNAMIC DEDUCTIONS (apply these to the final score):`;
        
        if (jobPriorities.work_location === 'onsite') {
            deductions += `
- Remote-only preference (onsite required): -15 points`;
        }
        if (jobPriorities.team_collaboration === 'required') {
            deductions += `
- No team collaboration experience: -10 points`;
        }
        if (jobPriorities.fast_paced === 'required') {
            deductions += `
- No fast-paced environment experience: -10 points`;
        }
        if (jobPriorities.cross_functional === 'required') {
            deductions += `
- No cross-functional experience: -10 points`;
        }
        
        deductions += `
- Missing required certifications: -10 points
- Employment gaps > 6 months: -5 points
- Job hopping (multiple jobs < 1 year): -10 points
- No relevant industry experience: -15 points
- Poor formatting/spelling errors: -5 points`;

        // Bonus factors based on job priorities
        if (jobPriorities.bonus_factors && jobPriorities.bonus_factors.length > 0) {
            bonusFactors = `
BONUS FACTORS (add these to the final score):`;
            jobPriorities.bonus_factors.forEach(factor => {
                bonusFactors += `
- ${factor}: +5 points`;
            });
        }
        
        // Industry-specific scoring
        if (jobPriorities.industry === 'mRNA' || jobPriorities.industry === 'biotech') {
            bonusFactors += `
INDUSTRY-SPECIFIC BONUSES:
- Direct mRNA experience: +15 points
- Industry experience: +10 points
- PhD in relevant field: +10 points
- Publications in high impact journals: +10 points
- Conference presentations: +5 points
- Innovation and problem-solving experience: +5 points`;
        }
        
    } else {
        // Default scoring criteria
        scoringCriteria = `
DEFAULT SCORING CRITERIA:

1. ROLE MATCH (30% of score):
   - Exact title match: +30 points
   - Very similar role: +20 points
   - Related role: +10 points
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

4. EDUCATION (20% of score):
   - Required degree + relevant field: +20 points
   - Required degree + different field: +14 points
   - Higher degree than required: +16 points
   - Lower degree than required: +6 points
   - No relevant education: 0 points

5. ACHIEVEMENTS & IMPACT (5% of score):
   - Exceptional achievements: +5 points
   - Good achievements: +4 points
   - Some achievements: +2 points
   - Basic achievements: +1 point
   - No significant achievements: 0 points`;

        deductions = `
DEDUCTIONS (apply these to the final score):
- Missing required certifications: -10 points
- Employment gaps > 6 months: -5 points
- Job hopping (multiple jobs < 1 year): -10 points
- No relevant industry experience: -15 points
- Poor formatting/spelling errors: -5 points`;
    }

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

90-100: PERFECT MATCH - Perfect match, significantly exceeds all requirements, outstanding achievements
85-89: EXCEPTIONAL - Meets all requirements with some exceeding expectations
70-84: GOOD - Meets most requirements, some gaps but strong potential
55-69: FAIR - Meets some requirements, significant gaps present
35-54: POOR - Meets few requirements, major gaps
0-34: VERY POOR - Does not meet requirements

${scoringCriteria}

${deductions}

${bonusFactors}

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
    const analyzeJobBtn = document.getElementById('analyzeJobBtn');
    const analyzeCVsBtn = document.getElementById('analyzeCVsBtn');
    
    // Step 1: Check if job description is ready
    const hasJobDescription = document.getElementById('jobTitle').value.trim() && 
                             document.getElementById('jobDescription').value.trim();
    
    if (hasJobDescription) {
        analyzeJobBtn.disabled = false;
        analyzeJobBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        analyzeJobBtn.disabled = true;
        analyzeJobBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    // Step 2: Check if CVs are ready (only if step 2 is visible)
    const step2Section = document.getElementById('step2Section');
    if (step2Section && !step2Section.classList.contains('hidden')) {
        const hasFiles = selectedFiles.length > 0;
        
        if (hasFiles) {
            analyzeCVsBtn.disabled = false;
            analyzeCVsBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            analyzeCVsBtn.disabled = true;
            analyzeCVsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

function showResults() {
    console.log('Showing results...');
    console.log('Analysis results length:', analysisResults.length);
    console.log('Analysis results:', analysisResults);
    
    filteredResults = [...analysisResults];
    currentPage = 1;
    
    console.log('Filtered results length:', filteredResults.length);
    console.log('Filtered results:', filteredResults);
    
    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('analyticsSection').classList.remove('hidden');
    
    console.log('Calling updateResultsTable...');
    updateResultsTable();
    console.log('Calling updateAnalytics...');
    updateAnalytics();
    console.log('Calling updatePagination...');
    updatePagination();
    console.log('Results display complete.');
}

function updateResultsTable() {
    console.log('Updating results table...');
    
    const tbody = document.getElementById('resultsTable');
    if (!tbody) {
        console.error('Results table tbody not found!');
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = filteredResults.slice(startIndex, endIndex);
    
    console.log('Current page:', currentPage);
    console.log('Items per page:', itemsPerPage);
    console.log('Start index:', startIndex);
    console.log('End index:', endIndex);
    console.log('Page results:', pageResults);
    
    tbody.innerHTML = '';
    
    if (pageResults.length === 0) {
        console.log('No results to display');
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No results to display</td></tr>';
        return;
    }
    
    pageResults.forEach((result, index) => {
        console.log(`Creating row for result ${index}:`, result);
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 fade-in';
        
        const scoreColor = getScoreColor(result.score);
        console.log(`Score color for ${result.score}:`, scoreColor);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreColor}">
                        ${result.score}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="showCandidateDetails(${startIndex + index})" 
                        class="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 font-medium">
                    ${result.name || 'N/A'}
                </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.role || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.company || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.duration || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${result.education || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex space-x-2">
                    <button onclick="showCandidateDetails(${startIndex + index})" 
                            class="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1">
                        <i class="fas fa-eye mr-1"></i>Details
                    </button>
                    <button onclick="downloadCV(${startIndex + index})" 
                            class="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1">
                        <i class="fas fa-download mr-1"></i>CV
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
        console.log(`Added row ${index} to table`);
    });
    
    console.log('Table update complete. Total rows added:', pageResults.length);
}

function getScoreColor(score) {
    if (score >= 90) return 'bg-emerald-100 text-emerald-800'; // Perfect Match
    if (score >= 85) return 'bg-green-100 text-green-800';    // Exceptional
    if (score >= 70) return 'bg-blue-100 text-blue-800';      // Good
    if (score >= 55) return 'bg-yellow-100 text-yellow-800';  // Fair
    if (score >= 35) return 'bg-orange-100 text-orange-800';  // Poor
    return 'bg-red-100 text-red-800';                         // Very Poor
}

function getScoreRange(score) {
    if (score >= 90) return '90-100 (Perfect Match)';
    if (score >= 85) return '85-89 (Exceptional)';
    if (score >= 70) return '70-84 (Good)';
    if (score >= 55) return '55-69 (Fair)';
    if (score >= 35) return '35-54 (Poor)';
    return '0-34 (Very Poor)';
}

function getScoreDescription(score) {
    if (score >= 90) return 'Perfect match, significantly exceeds all requirements';
    if (score >= 85) return 'Meets all requirements with some exceeding expectations';
    if (score >= 70) return 'Meets most requirements with strong potential';
    if (score >= 55) return 'Meets some requirements, significant gaps present';
    if (score >= 35) return 'Meets few requirements, major gaps';
    return 'Does not meet requirements';
}

function getRecommendation(score) {
    if (score >= 90) return 'Strongly recommend for interview';
    if (score >= 85) return 'Recommend for interview';
    if (score >= 70) return 'Consider for interview';
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
        
        // Apply skill filters
        const meetsSkillFilters = activeFilters.skills.size === 0 || 
            activeFilters.skills.has('any') || 
            activeFilters.skills.some(skill => 
                result.summary.toLowerCase().includes(skill.toLowerCase()) ||
                result.rationale.toLowerCase().includes(skill.toLowerCase())
            );
        
        // Apply experience filters (simplified - could be enhanced with more sophisticated logic)
        const meetsExperienceFilters = activeFilters.experience.size === 0;
        
        // Apply education filters
        const meetsEducationFilters = activeFilters.education.size === 0 || 
            activeFilters.education.some(edu => 
                result.education.toLowerCase().includes(edu.replace('_', ' '))
            );
        
        return meetsScore && meetsSearch && meetsSkillFilters && meetsExperienceFilters && meetsEducationFilters;
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
    updateSummaryCards();
}

// Update summary cards
function updateSummaryCards() {
    const totalCandidates = document.getElementById('totalCandidatesCount');
    const averageScore = document.getElementById('averageScoreValue');
    const topScore = document.getElementById('topScoreValue');
    const exceptionalCount = document.getElementById('exceptionalCountValue');
    
    if (totalCandidates) totalCandidates.textContent = filteredResults.length;
    if (averageScore) {
        const avg = filteredResults.length > 0 ? 
            (filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length).toFixed(1) : '0';
        averageScore.textContent = avg;
    }
    if (topScore) {
        const top = filteredResults.length > 0 ? Math.max(...filteredResults.map(r => r.score)) : 0;
        topScore.textContent = top;
    }
    if (exceptionalCount) {
        const exceptional = filteredResults.filter(r => r.score >= 85).length;
        exceptionalCount.textContent = exceptional;
    }
}

// Update experience level chart
function updateExperienceChart() {
    const ctx = document.getElementById('experienceChart');
    if (!ctx) return;
    
    // Clear existing chart
    if (window.experienceChart) {
        window.experienceChart.destroy();
    }
    
    // Analyze experience levels from CV data
    const experienceData = {
        'Entry Level': 0,
        'Mid Level': 0,
        'Senior Level': 0,
        'Executive': 0
    };
    
    filteredResults.forEach(result => {
        const duration = result.duration.toLowerCase();
        const role = result.role.toLowerCase();
        
        if (duration.includes('intern') || role.includes('junior') || role.includes('entry')) {
            experienceData['Entry Level']++;
        } else if (role.includes('senior') || role.includes('lead') || role.includes('manager')) {
            experienceData['Senior Level']++;
        } else if (role.includes('director') || role.includes('vp') || role.includes('chief') || role.includes('executive')) {
            experienceData['Executive']++;
        } else {
            experienceData['Mid Level']++;
        }
    });
    
    window.experienceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(experienceData),
            datasets: [{
                data: Object.values(experienceData),
                backgroundColor: [
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#F59E0B', // Orange
                    '#8B5CF6'  // Purple
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Update education distribution chart
function updateEducationChart() {
    const ctx = document.getElementById('educationChart');
    if (!ctx) return;
    
    // Clear existing chart
    if (window.educationChart) {
        window.educationChart.destroy();
    }
    
    // Analyze education levels from CV data
    const educationData = {
        'High School': 0,
        'Bachelor\'s': 0,
        'Master\'s': 0,
        'PhD': 0
    };
    
    filteredResults.forEach(result => {
        const education = result.education.toLowerCase();
        
        if (education.includes('phd') || education.includes('doctorate')) {
            educationData['PhD']++;
        } else if (education.includes('master') || education.includes('ms') || education.includes('mba')) {
            educationData['Master\'s']++;
        } else if (education.includes('bachelor') || education.includes('bs') || education.includes('ba')) {
            educationData['Bachelor\'s']++;
        } else {
            educationData['High School']++;
        }
    });
    
    window.educationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(educationData),
            datasets: [{
                data: Object.values(educationData),
                backgroundColor: [
                    '#6B7280', // Gray
                    '#3B82F6', // Blue
                    '#8B5CF6', // Purple
                    '#10B981'  // Green
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Update top candidates showcase
function updateTopCandidatesShowcase() {
    const showcase = document.getElementById('topCandidatesShowcase');
    if (!showcase) return;
    
    showcase.innerHTML = '';
    
    const topCandidates = filteredResults.slice(0, 5);
    
    topCandidates.forEach((candidate, index) => {
        const card = document.createElement('div');
        card.className = 'bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow';
        
        const rank = index + 1;
        const rankColor = rank === 1 ? 'text-yellow-600' : 
                         rank === 2 ? 'text-gray-600' : 
                         rank === 3 ? 'text-orange-600' : 'text-gray-500';
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <span class="text-2xl font-bold ${rankColor}">#${rank}</span>
                <span class="text-sm font-semibold ${getScoreColor(candidate.score)} px-2 py-1 rounded-full">
                    ${candidate.score}/100
                </span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-1 truncate">${candidate.name}</h4>
            <p class="text-sm text-gray-600 mb-2 truncate">${candidate.role}</p>
            <p class="text-xs text-gray-500 truncate">${candidate.company}</p>
            <div class="mt-3">
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${candidate.score}%"></div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => showCandidateDetails(filteredResults.indexOf(candidate)));
        card.style.cursor = 'pointer';
        
        showcase.appendChild(card);
    });
}

function updateInsightsPanel() {
    const insightsContainer = document.getElementById('insightsPanel');
    if (!insightsContainer) return;
    
    const insights = generateInsights();
    
    insightsContainer.innerHTML = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 class="font-medium text-blue-800 mb-2">📊 Analysis Summary</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-blue-700"><strong>Total Candidates:</strong> ${filteredResults.length}</p>
                        <p class="text-blue-700"><strong>Average Score:</strong> ${insights.averageScore.toFixed(1)}</p>
                        <p class="text-blue-700"><strong>Top Score:</strong> ${insights.topScore}</p>
                    </div>
                    <div>
                        <p class="text-blue-700"><strong>Exceptional:</strong> ${insights.exceptionalCount}</p>
                        <p class="text-blue-700"><strong>Good:</strong> ${insights.goodCount}</p>
                        <p class="text-blue-700"><strong>Fair:</strong> ${insights.fairCount}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 class="font-medium text-green-800 mb-2">🎯 Recommendations</h4>
                <ul class="text-sm text-green-700 space-y-1">
                    ${insights.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                </ul>
            </div>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 class="font-medium text-yellow-800 mb-2">⚠️ Common Gaps</h4>
                <ul class="text-sm text-yellow-700 space-y-1">
                    ${insights.commonGaps.map(gap => `<li>• ${gap}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function generateInsights() {
    if (filteredResults.length === 0) {
        return {
            averageScore: 0,
            topScore: 0,
            exceptionalCount: 0,
            goodCount: 0,
            fairCount: 0,
            recommendations: ['No data available'],
            commonGaps: ['No data available']
        };
    }
    
    const scores = filteredResults.map(r => r.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const topScore = Math.max(...scores);
    
    const exceptionalCount = filteredResults.filter(r => r.score >= 85).length;
    const goodCount = filteredResults.filter(r => r.score >= 70 && r.score < 85).length;
    const fairCount = filteredResults.filter(r => r.score >= 55 && r.score < 70).length;
    
    // Generate recommendations
    const recommendations = [];
    if (exceptionalCount > 0) {
        recommendations.push(`Focus on ${exceptionalCount} exceptional candidates first`);
    }
    if (averageScore < 60) {
        recommendations.push('Consider revising job requirements or expanding search');
    }
    if (filteredResults.length > 50) {
        recommendations.push('Large candidate pool - consider additional filtering criteria');
    }
    
    // Analyze common gaps
    const allText = filteredResults.map(r => r.rationale + ' ' + r.summary).join(' ').toLowerCase();
    const commonGaps = [];
    
    if (allText.includes('experience') && allText.includes('limited')) {
        commonGaps.push('Limited relevant experience');
    }
    if (allText.includes('skills') && allText.includes('missing')) {
        commonGaps.push('Missing required technical skills');
    }
    if (allText.includes('education') && allText.includes('mismatch')) {
        commonGaps.push('Education level mismatch');
    }
    
    return {
        averageScore,
        topScore,
        exceptionalCount,
        goodCount,
        fairCount,
        recommendations: recommendations.length > 0 ? recommendations : ['No specific recommendations'],
        commonGaps: commonGaps.length > 0 ? commonGaps : ['No common gaps identified']
    };
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
    const headers = ['Score', 'Name', 'Role', 'Company', 'Duration', 'Education', 'Summary', 'Recommendation'];
    const csvContent = [
        headers.join(','),
        ...filteredResults.map(result => [
            result.score,
            `"${result.name}"`,
            `"${result.role}"`,
            `"${result.company}"`,
            `"${result.duration}"`,
            `"${result.education}"`,
            `"${result.summary.replace(/"/g, '""')}"`,
            `"${getRecommendation(result.score)}"`
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, `cv_analysis_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function exportToJSON() {
    const exportData = {
        exportDate: new Date().toISOString(),
        totalCandidates: filteredResults.length,
        analysisResults: filteredResults.map(result => ({
            ...result,
            recommendation: getRecommendation(result.score),
            scoreRange: getScoreRange(result.score)
        })),
        summary: generateInsights()
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `cv_analysis_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function exportDetailedReport() {
    const insights = generateInsights();
    const jobTitle = document.getElementById('jobTitle').value || 'Position';
    const jobDescription = document.getElementById('jobDescription').value || 'Job Description';
    
    // Generate score distribution data for chart
    const scoreRanges = {
        'Exceptional (85-100)': filteredResults.filter(r => r.score >= 85).length,
        'Good (70-84)': filteredResults.filter(r => r.score >= 70 && r.score < 85).length,
        'Fair (55-69)': filteredResults.filter(r => r.score >= 55 && r.score < 70).length,
        'Poor (35-54)': filteredResults.filter(r => r.score >= 35 && r.score < 55).length,
        'Very Poor (0-34)': filteredResults.filter(r => r.score < 35).length
    };
    
    // Create SVG chart for score distribution
    const chartWidth = 400;
    const chartHeight = 200;
    const maxValue = Math.max(...Object.values(scoreRanges));
    const barWidth = 60;
    const barSpacing = 20;
    const totalWidth = Object.keys(scoreRanges).length * (barWidth + barSpacing) - barSpacing;
    const startX = (chartWidth - totalWidth) / 2;
    
    let chartSvg = `<svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="${chartWidth}" height="${chartHeight}" fill="#F8FAFC" rx="8"/>
        <text x="${chartWidth/2}" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1F2937">Score Distribution</text>`;
    
    Object.entries(scoreRanges).forEach(([range, count], index) => {
        const x = startX + index * (barWidth + barSpacing);
        const barHeight = maxValue > 0 ? (count / maxValue) * 120 : 0;
        const y = chartHeight - 40 - barHeight;
        const color = range.includes('Exceptional') ? '#10B981' : 
                     range.includes('Good') ? '#3B82F6' : 
                     range.includes('Fair') ? '#F59E0B' : 
                     range.includes('Poor') ? '#EF4444' : '#6B7280';
        
        chartSvg += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>
            <text x="${x + barWidth/2}" y="${chartHeight - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">${range.split(' ')[0]}</text>
            <text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1F2937">${count}</text>`;
    });
    
    chartSvg += '</svg>';
    
    // Create progress bars for top candidates
    const topCandidates = filteredResults.slice(0, 5);
    let topCandidatesHtml = '';
    topCandidates.forEach((candidate, index) => {
        const progressWidth = candidate.score;
        const color = getScoreColor(candidate.score);
        topCandidatesHtml += `
            <div class="candidate-item">
                <div class="candidate-header">
                    <span class="candidate-rank">#${index + 1}</span>
                    <span class="candidate-name">${candidate.name}</span>
                    <span class="candidate-score">${candidate.score}/100</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressWidth}%; background-color: ${color};"></div>
                </div>
                <div class="candidate-details">
                    <span class="candidate-role">${candidate.role} at ${candidate.company}</span>
                    <span class="candidate-duration">${candidate.duration}</span>
                </div>
            </div>`;
    });
    
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI CV Screener - Detailed Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3B82F6;
            display: flex;
            align-items: center;
        }
        
        .section-title i {
            margin-right: 10px;
            color: #3B82F6;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #E2E8F0;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #3B82F6;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #6B7280;
            font-weight: 500;
        }
        
        .chart-container {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .top-candidates {
            background: #F8FAFC;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .candidate-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid #E2E8F0;
        }
        
        .candidate-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .candidate-rank {
            background: #3B82F6;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .candidate-name {
            font-weight: 600;
            color: #1F2937;
        }
        
        .candidate-score {
            font-weight: 700;
            color: #3B82F6;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #E2E8F0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        
        .candidate-details {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: #6B7280;
        }
        
        .recommendations {
            background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
            border: 1px solid #A7F3D0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .recommendations h3 {
            color: #065F46;
            margin-bottom: 15px;
        }
        
        .recommendations ul {
            list-style: none;
        }
        
        .recommendations li {
            padding: 8px 0;
            border-bottom: 1px solid #A7F3D0;
        }
        
        .recommendations li:before {
            content: "✓";
            color: #10B981;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .gaps {
            background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
            border: 1px solid #FCD34D;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .gaps h3 {
            color: #92400E;
            margin-bottom: 15px;
        }
        
        .gaps ul {
            list-style: none;
        }
        
        .gaps li {
            padding: 8px 0;
            border-bottom: 1px solid #FCD34D;
        }
        
        .gaps li:before {
            content: "⚠";
            color: #F59E0B;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .candidates-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .candidates-table th {
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        .candidates-table td {
            padding: 15px;
            border-bottom: 1px solid #E2E8F0;
        }
        
        .candidates-table tr:nth-child(even) {
            background: #F8FAFC;
        }
        
        .candidates-table tr:hover {
            background: #EFF6FF;
        }
        
        .score-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            color: white;
        }
        
        .footer {
            background: #1F2937;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9rem;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .header {
                background: #3B82F6 !important;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-brain"></i> AI CV Screener Report</h1>
            <p>Comprehensive Analysis for ${jobTitle}</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2 class="section-title">
                    <i class="fas fa-chart-bar"></i>
                    Executive Summary
                </h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${filteredResults.length}</div>
                        <div class="stat-label">Total Candidates</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${insights.averageScore.toFixed(1)}</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${insights.topScore}</div>
                        <div class="stat-label">Top Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${insights.exceptionalCount}</div>
                        <div class="stat-label">Exceptional Candidates</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <h3>Score Distribution</h3>
                    ${chartSvg}
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">
                    <i class="fas fa-trophy"></i>
                    Top 5 Candidates
                </h2>
                <div class="top-candidates">
                    ${topCandidatesHtml}
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">
                    <i class="fas fa-lightbulb"></i>
                    Key Insights & Recommendations
                </h2>
                
                <div class="recommendations">
                    <h3><i class="fas fa-check-circle"></i> Recommendations</h3>
                    <ul>
                        ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="gaps">
                    <h3><i class="fas fa-exclamation-triangle"></i> Common Gaps Identified</h3>
                    <ul>
                        ${insights.commonGaps.map(gap => `<li>${gap}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">
                    <i class="fas fa-users"></i>
                    Detailed Candidate Analysis
                </h2>
                
                <table class="candidates-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Company</th>
                            <th>Duration</th>
                            <th>Education</th>
                            <th>Score</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredResults.map((result, index) => {
                            const scoreColor = getScoreColor(result.score);
                            return `
                            <tr>
                                <td><strong>#${index + 1}</strong></td>
                                <td><strong>${result.name}</strong></td>
                                <td>${result.role}</td>
                                <td>${result.company}</td>
                                <td>${result.duration}</td>
                                <td>${result.education}</td>
                                <td><span class="score-badge" style="background-color: ${scoreColor};">${result.score}/100</span></td>
                                <td>${getRecommendation(result.score)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">
                    <i class="fas fa-file-alt"></i>
                    Detailed Analysis
                </h2>
                
                ${filteredResults.map((result, index) => `
                <div style="background: #F8FAFC; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #E2E8F0;">
                    <h3 style="color: #3B82F6; margin-bottom: 15px; display: flex; align-items: center;">
                        <span style="background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 10px; font-size: 0.8rem;">#${index + 1}</span>
                        ${result.name}
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div><strong>Role:</strong> ${result.role} at ${result.company}</div>
                        <div><strong>Duration:</strong> ${result.duration}</div>
                        <div><strong>Education:</strong> ${result.education}</div>
                        <div><strong>Score:</strong> <span style="color: ${getScoreColor(result.score)}; font-weight: 600;">${result.score}/100 (${getScoreRange(result.score)})</span></div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong>Summary:</strong> ${result.summary}
                    </div>
                    
                    <div>
                        <strong>Detailed Analysis:</strong> ${result.rationale}
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by AI CV Screener | Powered by OpenAI GPT</p>
            <p>This report contains confidential candidate information. Please handle with appropriate discretion.</p>
        </div>
    </div>
</body>
</html>`;
    
    downloadFile(htmlContent, `detailed_report_${new Date().toISOString().split('T')[0]}.html`, 'text/html');
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
    jobPriorities = {};
    activeFilters = {
        skills: new Set(),
        experience: new Set(),
        education: new Set()
    };
    
    // Clear form inputs
    document.getElementById('jobTitle').value = '';
    document.getElementById('jobDescription').value = '';
    document.getElementById('jdFile').value = '';
    document.getElementById('cvFiles').value = '';
    document.getElementById('searchFilter').value = '';
    document.getElementById('scoreFilter').value = 0;
    document.getElementById('scoreFilterValue').textContent = '0';
    
    // Reset step 1
    document.getElementById('jobAnalysisResults').classList.add('hidden');
    document.getElementById('requiredSkillsContainer').innerHTML = '';
    document.getElementById('newSkillInput').value = '';
    
    // Reset weights to default
    document.getElementById('roleMatchWeight').value = 30;
    document.getElementById('experienceWeight').value = 25;
    document.getElementById('skillsWeight').value = 20;
    document.getElementById('educationWeight').value = 20;
    document.getElementById('achievementsWeight').value = 5;
    updateWeightTotal();
    
    // Reset selects
    document.getElementById('industrySelect').value = '';
    document.getElementById('workLocationSelect').value = 'onsite';
    
    // Hide dynamic sections
    document.getElementById('jobRequirementsSummary').classList.add('hidden');
    document.getElementById('skillFilters').classList.add('hidden');
    document.getElementById('experienceFilters').classList.add('hidden');
    document.getElementById('educationFilters').classList.add('hidden');
    
    // Reset to step 1
    document.getElementById('step1Section').classList.remove('hidden');
    document.getElementById('step2Section').classList.add('hidden');
    
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
                   type === 'error' ? 'bg-red-500' : 
                   type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    notification.className += ` ${bgColor} text-white`;
    
    const iconClass = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' :
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas ${iconClass}"></i>
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