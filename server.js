require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Token Generation Endpoint
 * 
 * This endpoint generates a temporary access token for anonymous chatbot access.
 * It uses the domain API key to authenticate with the Aventora Domain Chatbot API.
 * 
 * IMPORTANT: This endpoint should be protected in production (rate limiting, authentication, etc.)
 * 
 * Request Body:
 * {
 *   "domain": "optional-domain-name",
 *   "language": "en" (optional, defaults to "en")
 * }
 * 
 * Response:
 * {
 *   "token": "uuid-token-string",
 *   "expires_at": "2024-01-01T00:00:00Z"
 * }
 */
app.post('/api/chatbot-token', async (req, res) => {
  try {
    const { domain, language = 'en' } = req.body;

    // Get configuration from environment variables
    let domainApiKey = process.env.DOMAIN_CHATBOT_API_KEY;
    const domainChatbotApiUrl = process.env.DOMAIN_CHATBOT_API_URL || 'https://api.aventora.ai';

    if (!domainApiKey) {
      console.error('[chatbot-token] DOMAIN_CHATBOT_API_KEY not configured');
      return res.status(500).json({
        error: 'Chatbot service not configured. Please set DOMAIN_CHATBOT_API_KEY environment variable.',
        hint: 'Get your API key from the Aventora Admin Panel'
      });
    }

    // Trim whitespace from API key (common issue)
    domainApiKey = domainApiKey.trim();

    // Log API key prefix for debugging (first 8 chars + last 4 chars, e.g., "avk_xxxx...yyyy")
    const apiKeyPrefix = domainApiKey.length > 12 
      ? `${domainApiKey.substring(0, 8)}...${domainApiKey.substring(domainApiKey.length - 4)}`
      : '***';
    console.log(`[chatbot-token] Using API key: ${apiKeyPrefix}`);
    console.log(`[chatbot-token] API URL: ${domainChatbotApiUrl}`);

    // Build token generation request
    // The username "anonymous" will be converted to "{domain}_anonymous" by the API
    const tokenRequest = {
      username: 'anonymous', // Will be converted to {domain}_anonymous
      language: language,
      expires_in_hours: 24, // Token valid for 24 hours
    };

    const apiEndpoint = `${domainChatbotApiUrl}/auth/api/v1/tokens/generate`;
    console.log(`[chatbot-token] Requesting token from: ${apiEndpoint}`);

    // Generate token via Domain Chatbot API
    // The API endpoint is: /auth/api/v1/tokens/generate
    const tokenResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${domainApiKey}`,
      },
      body: JSON.stringify(tokenRequest),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[chatbot-token] Token generation failed:', tokenResponse.status, errorText);
      console.error('[chatbot-token] API Key prefix used:', apiKeyPrefix);
      console.error('[chatbot-token] API URL used:', domainChatbotApiUrl);
      
      // Provide more specific error hints
      let hint = 'Verify your DOMAIN_CHATBOT_API_KEY is correct and has token generation permissions';
      if (tokenResponse.status === 401) {
        hint = 'API key is invalid, expired, or revoked. Check: 1) Key is correct (no extra spaces), 2) Key exists in production database, 3) Key is active (not revoked), 4) Key has not expired, 5) Using correct API URL for production';
      }
      
      return res.status(tokenResponse.status).json({
        error: 'Failed to generate chatbot token',
        details: errorText,
        hint: hint,
        debug: {
          apiUrl: domainChatbotApiUrl,
          apiKeyPrefix: apiKeyPrefix,
          statusCode: tokenResponse.status
        }
      });
    }

    const tokenData = await tokenResponse.json();
    
    return res.json({
      token: tokenData.token,
      expires_at: tokenData.expires_at,
    });
  } catch (error) {
    console.error('[chatbot-token] Error generating token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Main route - serve the example page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  const hasApiKey = !!process.env.DOMAIN_CHATBOT_API_KEY;
  res.json({ 
    status: 'ok', 
    message: 'Aventora Chatbot Embedding Example Server',
    tokenEndpoint: '/api/chatbot-token',
    configured: hasApiKey
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Aventora Chatbot Embedding Example Server running on http://localhost:${PORT}`);
  console.log(`📖 Open http://localhost:${PORT} in your browser to see the examples`);
  console.log(`\n⚠️  IMPORTANT: Configure the following environment variables:`);
  console.log(`   - DOMAIN_CHATBOT_API_KEY: Your domain API key (get from Aventora Admin Panel)`);
  console.log(`   - DOMAIN_CHATBOT_API_URL: Domain chatbot API URL (default: https://api.aventora.ai)`);
  console.log(`   - CHATBOT_BASE_URL: Your chatbot base URL (e.g., https://yourdomain.aventora.app)`);
  if (!process.env.DOMAIN_CHATBOT_API_KEY) {
    console.log(`\n❌ DOMAIN_CHATBOT_API_KEY not set - token generation will fail`);
  }
});
