/**
 * Check if the API key hash matches what's in the database
 * 
 * This script calculates the SHA256 hash of your API key and helps you
 * verify it matches the hash stored in the database.
 */

require('dotenv').config();
const crypto = require('crypto');

const apiKey = process.env.DOMAIN_CHATBOT_API_KEY?.trim();

if (!apiKey) {
  console.error('❌ DOMAIN_CHATBOT_API_KEY not set in environment');
  process.exit(1);
}

console.log('🔍 API Key Hash Verification\n');
console.log('='.repeat(60));
console.log('\nAPI Key Details:');
console.log('  Prefix:', apiKey.substring(0, 8));
console.log('  Suffix:', apiKey.substring(apiKey.length - 4));
console.log('  Length:', apiKey.length, 'characters');
console.log('\nCalculated SHA256 Hash:');
const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
console.log('  ', hash);
console.log('\n' + '='.repeat(60));
console.log('\n📋 Next Steps:');
console.log('\n1. Run this SQL query on the PRODUCTION database:');
console.log('   SELECT api_key_hash FROM domain_api_keys');
console.log('   WHERE api_key_prefix = \'s2S0ij8s\' AND domain = \'kalano\';');
console.log('\n2. Compare the hash from the database with the hash above.');
console.log('   If they DON\'T match, your .env file has a different API key');
console.log('   than what\'s stored in the database.');
console.log('\n3. Possible causes:');
console.log('   - API key was regenerated but .env wasn\'t updated');
console.log('   - Wrong API key was copied to .env');
console.log('   - Extra characters/spaces in .env (though we trim)');
console.log('   - Copy-paste error when setting the key');
console.log('\n4. Solution:');
console.log('   - Get the CORRECT API key from Admin Panel');
console.log('   - Copy it EXACTLY (no extra spaces)');
console.log('   - Update .env file');
console.log('   - Restart server');

