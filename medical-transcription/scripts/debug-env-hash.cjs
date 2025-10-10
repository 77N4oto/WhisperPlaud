#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const hash = process.env.AUTH_PASSWORD_HASH;
console.log('Raw hash from .env.local:');
console.log(hash);
console.log('');
console.log('Hash length:', hash ? hash.length : 0);
console.log('Hash bytes:', Buffer.from(hash || '', 'utf8').toString('hex').substring(0, 100));

