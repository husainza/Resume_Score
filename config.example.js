// Configuration Example for AI CV Screener
// Copy this file to config.js and replace with your actual API key

// OpenAI API Configuration
const CONFIG = {
    // Replace this with your actual OpenAI API key from https://platform.openai.com/api-keys
    OPENAI_API_KEY: 'sk-YOUR_ACTUAL_OPENAI_API_KEY_HERE',
    
    // Optional: Customize the OpenAI model (default: gpt-4o-mini)
    OPENAI_MODEL: 'gpt-4o-mini',
    
    // Optional: Maximum tokens for OpenAI responses (default: 1000)
    MAX_TOKENS: 1000,
    
    // Optional: Temperature for OpenAI responses (default: 0.1 for consistency)
    TEMPERATURE: 0.1,
    
    // Optional: Batch size for processing CVs (default: 5)
    BATCH_SIZE: 5,
    
    // Optional: Delay between batches in milliseconds (default: 1000)
    BATCH_DELAY: 1000
};

// To use this configuration:
// 1. Copy this file to config.js
// 2. Replace YOUR_ACTUAL_OPENAI_API_KEY_HERE with your real OpenAI API key
// 3. Update app.js to import this configuration
// 4. Or simply replace the EMBEDDED_API_KEY constant in app.js directly

console.log('Configuration loaded. Please replace with your actual OpenAI API key.'); 