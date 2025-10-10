#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'password123';

  const AUTH_USERNAME = process.env.AUTH_USERNAME;
  const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;
  const JWT_SECRET = process.env.JWT_SECRET;

  console.log('=== Environment Variables ===');
  console.log('AUTH_USERNAME:', AUTH_USERNAME || '(NOT SET)');
  console.log('AUTH_PASSWORD_HASH:', AUTH_PASSWORD_HASH ? 'SET (' + AUTH_PASSWORD_HASH.length + ' chars)' : '(NOT SET)');
  console.log('JWT_SECRET:', JWT_SECRET ? 'SET' : '(NOT SET)');
  console.log('');

  console.log('=== Testing Authentication ===');
  console.log('Input username:', username);
  console.log('Input password:', password);
  console.log('');

  if (!AUTH_USERNAME || !AUTH_PASSWORD_HASH || !JWT_SECRET) {
    console.error('❌ FAIL: Environment variables not configured!');
    process.exit(1);
  }

  if (username !== AUTH_USERNAME) {
    console.error('❌ FAIL: Username mismatch!');
    console.error('Expected:', AUTH_USERNAME);
    console.error('Got:', username);
    process.exit(1);
  }

  console.log('✓ Username matches');
  console.log('Comparing password with bcrypt hash...');

  const isValid = await bcrypt.compare(password, AUTH_PASSWORD_HASH);
  
  console.log('');
  if (isValid) {
    console.log('✅ SUCCESS: Password is valid!');
  } else {
    console.log('❌ FAIL: Password is invalid!');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ ERROR:', e);
  process.exit(1);
});

