// Configuration for OpenAI API
const CONFIG = {
    // API Configuration - will be set via environment variables or localStorage
    OPENAI_API_KEY: (() => {
        // For deployment (GitHub Pages), use environment variables
        if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
            return process.env.OPENAI_API_KEY;
        }
        // For local development, try to get from localStorage or prompt user
        const localKey = localStorage.getItem('openai_api_key');
        if (localKey) {
            return localKey;
        }
        // If no key found, return empty string (will trigger configuration error)
        return '';
    })(),
    OPENAI_MODEL: (() => {
        if (typeof process !== 'undefined' && process.env && process.env.OPENAI_MODEL) {
            return process.env.OPENAI_MODEL;
        }
        return 'gpt-4o-mini';
    })(),
    OPENAI_MAX_TOKENS: (() => {
        if (typeof process !== 'undefined' && process.env && process.env.OPENAI_MAX_TOKENS) {
            return parseInt(process.env.OPENAI_MAX_TOKENS);
        }
        return 1000;
    })(),
    OPENAI_TEMPERATURE: (() => {
        if (typeof process !== 'undefined' && process.env && process.env.OPENAI_TEMPERATURE) {
            return parseFloat(process.env.OPENAI_TEMPERATURE);
        }
        return 0.1;
    })(),
    
    // App Configuration
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx'],
    MAX_CVS_PER_BATCH: 200,
    
    // UI Configuration
    ITEMS_PER_PAGE: 10,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
};

// Validate configuration
function validateConfig() {
    const errors = [];
    
    if (!CONFIG.OPENAI_API_KEY) {
        errors.push('OPENAI_API_KEY is not configured. Please set your API key in localStorage or configure GitHub Secrets for deployment.');
    }
    
    if (CONFIG.OPENAI_API_KEY && !CONFIG.OPENAI_API_KEY.startsWith('sk-') && !CONFIG.OPENAI_API_KEY.startsWith('sk-proj--')) {
        errors.push('Invalid OpenAI API key format');
    }
    
    return errors;
}

// Function to set API key for local development
function setApiKey(apiKey) {
    if (apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj--'))) {
        localStorage.setItem('openai_api_key', apiKey);
        CONFIG.OPENAI_API_KEY = apiKey;
        return true;
    }
    return false;
}

// Function to get current API key status
function getApiKeyStatus() {
    if (!CONFIG.OPENAI_API_KEY) {
        return { configured: false, message: 'No API key configured' };
    }
    if (!CONFIG.OPENAI_API_KEY.startsWith('sk-') && !CONFIG.OPENAI_API_KEY.startsWith('sk-proj--')) {
        return { configured: false, message: 'Invalid API key format' };
    }
    return { configured: true, message: 'API key configured' };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, validateConfig, setApiKey, getApiKeyStatus };
} else {
    window.CONFIG = CONFIG;
    window.validateConfig = validateConfig;
    window.setApiKey = setApiKey;
    window.getApiKeyStatus = getApiKeyStatus;
} 