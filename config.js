// Configuration for OpenAI API
const CONFIG = {
    // API Configuration - will be set via environment variables
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    OPENAI_TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1,
    
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
        errors.push('OPENAI_API_KEY is not configured');
    }
    
    if (!CONFIG.OPENAI_API_KEY.startsWith('sk-') && !CONFIG.OPENAI_API_KEY.startsWith('sk-proj--')) {
        errors.push('Invalid OpenAI API key format');
    }
    
    return errors;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, validateConfig };
} else {
    window.CONFIG = CONFIG;
    window.validateConfig = validateConfig;
} 