#!/usr/bin/env node
const bcrypt = require('bcryptjs');

async function main() {
  const pwd = process.argv[2];
  if (!pwd) {
    console.error('Usage: node scripts/bcrypt-hash.cjs "your-password"');
    process.exit(1);
  }
  const saltRounds = 10;
  const hash = bcrypt.hashSync(pwd, saltRounds);
  
  console.log('\n=== bcrypt hash generated ===');
  console.log('Raw hash:', hash);
  console.log('\n--- For .env files (REQUIRED: escape $ with \\$) ---');
  const escaped = hash.replaceAll('$', '\\$');
  console.log(`AUTH_PASSWORD_HASH=${escaped}`);
  console.log('\n--- Alternative: Base64 (for complex scenarios) ---');
  const b64 = Buffer.from(hash, 'utf8').toString('base64');
  console.log(`AUTH_PASSWORD_HASH_B64=${b64}`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


