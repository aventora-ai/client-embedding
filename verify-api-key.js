/**
 * Diagnostic script to verify API key configuration
 * 
 * Usage: node verify-api-key.js
 * 
 * This script will:
 * 1. Check if the API key is loaded from environment
 * 2. Show the API key prefix (first 8 + last 4 chars)
 * 3. Test the API key against the production API
 * 4. Provide diagnostic information
 */

require('dotenv').config();
const crypto = require('crypto');

async function verifyApiKey() {
  console.log('🔍 API Key Diagnostic Tool\n');
  console.log('=' .repeat(60));
  
  // 1. Check environment variables
  const apiKey = process.env.DOMAIN_CHATBOT_API_KEY;
  const apiUrl = process.env.DOMAIN_CHATBOT_API_URL || 'https://api.aventora.ai';
  
  console.log('\n1️⃣ Environment Variables:');
  console.log('   DOMAIN_CHATBOT_API_KEY:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)` : '❌ NOT SET');
  console.log('   DOMAIN_CHATBOT_API_URL:', apiUrl);
  
  if (!apiKey) {
    console.log('\n❌ ERROR: DOMAIN_CHATBOT_API_KEY is not set in environment variables');
    console.log('   Make sure you have a .env file with DOMAIN_CHATBOT_API_KEY set');
    process.exit(1);
  }
  
  // 2. Check API key format
  console.log('\n2️⃣ API Key Format:');
  const trimmedKey = apiKey.trim();
  if (trimmedKey !== apiKey) {
    console.log('   ⚠️  WARNING: API key has leading/trailing whitespace (will be auto-trimmed)');
  }
  console.log('   Length:', trimmedKey.length, 'characters');
  console.log('   Prefix:', trimmedKey.substring(0, 8));
  console.log('   Suffix:', trimmedKey.substring(trimmedKey.length - 4));
  
  // Calculate hash (same way backend does it)
  const hash = crypto.createHash('sha256').update(trimmedKey).digest('hex');
  console.log('   SHA256 Hash:', hash.substring(0, 16) + '...');
  
  // 3. Test API endpoint
  console.log('\n3️⃣ Testing API Endpoint:');
  const testUrl = `${apiUrl}/auth/api/v1/tokens/generate`;
  console.log('   URL:', testUrl);
  
  try {
    console.log('   Sending request...');
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        username: 'anonymous',
        language: 'en',
        expires_in_hours: 24,
      }),
    });
    
    console.log('   Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ SUCCESS! API key is valid');
      console.log('   Token generated:', data.token ? 'Yes' : 'No');
      console.log('   Expires at:', data.expires_at);
      console.log('   Domain:', data.domain);
    } else {
      const errorText = await response.text();
      console.log('\n❌ FAILED: API key validation failed');
      console.log('   Error:', errorText);
      
      // Provide specific guidance based on status code
      if (response.status === 401) {
        console.log('\n💡 Troubleshooting Steps:');
        console.log('   1. Verify the API key exists in the PRODUCTION database');
        console.log('   2. Check that the API key is active (is_active = true)');
        console.log('   3. Verify the API key has not expired');
        console.log('   4. Ensure you\'re using the correct API URL for production');
        console.log('   5. Check that the API key was created for the correct domain');
        console.log('\n   SQL Query to check:');
        console.log('   SELECT id, api_key_prefix, domain, name, is_active, expires_at');
        console.log('   FROM domain_api_keys');
        console.log('   WHERE api_key_prefix = \'' + trimmedKey.substring(0, 8) + '\'');
        console.log('   ORDER BY created_at DESC;');
      }
    }
  } catch (error) {
    console.log('\n❌ ERROR: Failed to connect to API');
    console.log('   Error:', error.message);
    console.log('\n💡 Check:');
    console.log('   1. Network connectivity');
    console.log('   2. API URL is correct:', apiUrl);
    console.log('   3. API server is running and accessible');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the diagnostic
verifyApiKey().catch(console.error);

