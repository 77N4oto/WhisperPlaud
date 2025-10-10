#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

console.log('Environment variables check:');
console.log('AUTH_USERNAME:', process.env.AUTH_USERNAME || '(not set)');
console.log('AUTH_PASSWORD_HASH:', process.env.AUTH_PASSWORD_HASH ? '✓ SET (length: ' + process.env.AUTH_PASSWORD_HASH.length + ')' : '✗ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ SET' : '✗ NOT SET');
console.log('S3_ENDPOINT:', process.env.S3_ENDPOINT || '(not set)');
console.log('REDIS_HOST:', process.env.REDIS_HOST || '(not set)');

