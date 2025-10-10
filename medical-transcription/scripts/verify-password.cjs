#!/usr/bin/env node
const bcrypt = require('bcryptjs');

async function main() {
  const password = process.argv[2];
  const hash = process.argv[3];
  
  if (!password || !hash) {
    console.error('Usage: node scripts/verify-password.cjs "password" "hash"');
    process.exit(1);
  }
  
  const isValid = bcrypt.compareSync(password, hash);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log(`Valid: ${isValid}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

