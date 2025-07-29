// Secure OpenAI API Service
class OpenAIService {
    constructor() {
        this.baseURL = 'https://api.openai.com/v1';
        this.apiKey = CONFIG.OPENAI_API_KEY;
        this.model = CONFIG.OPENAI_MODEL;
        this.maxTokens = CONFIG.OPENAI_MAX_TOKENS;
        this.temperature = CONFIG.OPENAI_TEMPERATURE;
    }

    // Validate API key
    validateApiKey() {
        if (!this.apiKey) {
            throw new Error('OpenAI API key is not configured');
        }
        
        if (!this.apiKey.startsWith('sk-') && !this.apiKey.startsWith('sk-proj--')) {
            throw new Error('Invalid OpenAI API key format');
        }
        
        return true;
    }

    // Make API request with proper error handling
    async makeRequest(endpoint, data) {
        try {
            this.validateApiKey();
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v1'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('OpenAI API request failed:', error);
            throw error;
        }
    }

    // Extract job priorities from job description
    async extractJobPriorities(jobTitle, jobDescription) {
        const prompt = `Analyze the following job description and extract key priorities, requirements, and scoring factors. Focus on identifying what the employer values most.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Please provide your analysis in the following JSON format only (no additional text):

{
  "industry": "Primary industry (e.g., 'mRNA', 'biotech', 'software', 'finance')",
  "required_skills": ["skill1", "skill2", "skill3"],
  "preferred_skills": ["skill1", "skill2"],
  "education_priority": "high/medium/low",
  "experience_priority": "high/medium/low",
  "technical_priority": "high/medium/low",
  "leadership_priority": "high/medium/low",
  "publications_priority": "high/medium/low",
  "certifications_priority": "high/medium/low",
  "work_location": "onsite/remote/hybrid",
  "team_collaboration": "required/preferred/not_mentioned",
  "fast_paced": "required/preferred/not_mentioned",
  "cross_functional": "required/preferred/not_mentioned",
  "specific_requirements": ["requirement1", "requirement2"],
  "red_flags": ["flag1", "flag2"],
  "bonus_factors": ["factor1", "factor2"]
}

Focus on:
1. Industry-specific requirements
2. Technical vs soft skills emphasis
3. Education level preferences
4. Experience requirements
5. Work environment preferences
6. Any specific technologies or methodologies mentioned
7. Leadership or management requirements
8. Publication or research requirements

Respond with ONLY the JSON object, no additional text or formatting.`;

        const response = await this.makeRequest('/chat/completions', {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert HR recruiter analyzing job descriptions. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: this.temperature
        });

        const content = response.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            throw new Error('Invalid JSON response from API');
        }
    }

    // Analyze CV against job requirements
    async analyzeCV(jobTitle, jobDescription, cvText, jobPriorities = {}) {
        const prompt = this.createAnalysisPrompt(jobTitle, jobDescription, cvText, jobPriorities);
        
        const response = await this.makeRequest('/chat/completions', {
            model: this.model,
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
            max_tokens: this.maxTokens,
            temperature: this.temperature
        });

        const content = response.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            throw new Error('Invalid JSON response from API');
        }
    }

    // Create analysis prompt with dynamic scoring
    createAnalysisPrompt(jobTitle, jobDescription, cvText, jobPriorities) {
        // Build dynamic scoring criteria based on extracted job priorities
        let scoringCriteria = '';
        let deductions = '';
        let bonusFactors = '';
        
        if (jobPriorities && Object.keys(jobPriorities).length > 0) {
            // Get weights from form inputs (user-defined)
            const weights = {
                roleMatch: parseInt(document.getElementById('roleMatchWeight')?.value) || 30,
                experienceRelevance: parseInt(document.getElementById('experienceWeight')?.value) || 25,
                skillsMatch: parseInt(document.getElementById('skillsWeight')?.value) || 20,
                education: parseInt(document.getElementById('educationWeight')?.value) || 20,
                achievements: parseInt(document.getElementById('achievementsWeight')?.value) || 5
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
   - PhD in relevant field: +${weights.education} points
   - MS in relevant field: +${Math.floor(weights.education * 0.8)} points
   - BS in relevant field: +${Math.floor(weights.education * 0.6)} points
   - Other degree: +${Math.floor(weights.education * 0.3)} points
   - No degree: 0 points

5. ACHIEVEMENTS & IMPACT (${weights.achievements}% of score):
   - High impact publications: +${weights.achievements} points
   - Conference presentations: +${Math.floor(weights.achievements * 0.7)} points
   - Patents or innovations: +${Math.floor(weights.achievements * 0.8)} points
   - Leadership roles: +${Math.floor(weights.achievements * 0.6)} points
   - No significant achievements: 0 points

DEDUCTIONS:
- International experience penalty: -2 points per year (relative to US experience)
- Missing required skills: -5 points per skill
- No relevant industry experience: -10 points
- No technical skills: -15 points

BONUS FACTORS:
- Direct mRNA experience: +10 points
- Industry experience (vs CRO): +5 points
- High impact journal publications: +8 points
- Cross-functional experience: +5 points
- Fast-paced environment experience: +3 points`;
        }

        return `You are a strict and experienced HR recruiter. Analyze the following CV against the job requirements and provide a comprehensive evaluation.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}

CV TEXT:
${cvText}

${scoringCriteria}

STRICT SCORING GUIDELINES:
- Be very strict and experienced in your evaluation
- Score on a scale of 0-100
- 90-100: Perfect Match (exceptional fit)
- 85-89: Exceptional (very strong fit)
- 80-84: Strong (good fit)
- 70-79: Good (acceptable fit)
- 60-69: Fair (some concerns)
- Below 60: Poor (significant concerns)

Please provide your analysis in the following JSON format only (no additional text):

{
  "name": "Candidate's full name",
  "role": "Most recent job title",
  "company": "Most recent company",
  "duration": "Time in current role",
  "education": "Highest education level and field",
  "score": 85,
  "summary": "Brief summary of candidate's fit",
  "rationale": "Detailed explanation of scoring",
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "Strongly Recommend/Recommend/Consider/Do Not Recommend"
}

Focus on:
1. Exact role match and relevance
2. Required skills presence and proficiency
3. Industry experience alignment
4. Education level and field relevance
5. Achievements and impact
6. Cultural fit indicators
7. Any red flags or concerns

Respond with ONLY the JSON object, no additional text or formatting.`;
    }

    // Test API connection
    async testConnection() {
        try {
            const response = await this.makeRequest('/chat/completions', {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: 'Respond with only the word "SUCCESS"'
                    }
                ],
                max_tokens: 10,
                temperature: 0
            });

            const content = response.choices[0].message.content;
            return content.includes('SUCCESS');
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenAIService;
} else {
    window.OpenAIService = OpenAIService;
} 