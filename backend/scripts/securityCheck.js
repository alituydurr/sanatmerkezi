#!/usr/bin/env node

/**
 * Security Check Script
 * Runs various security checks on the application
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔒 Running Security Checks...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: .env file exists
console.log('1️⃣  Checking .env file...');
const envPath = join(__dirname, '..', '.env');
if (!existsSync(envPath)) {
  console.error('   ❌ ERROR: .env file not found!');
  console.error('   → Copy .env.example to .env and configure it');
  hasErrors = true;
} else {
  console.log('   ✅ .env file exists');
  
  // Check 2: JWT_SECRET is set
  const envContent = readFileSync(envPath, 'utf-8');
  if (!envContent.includes('JWT_SECRET=') || envContent.includes('JWT_SECRET=your_super_secret')) {
    console.error('   ❌ ERROR: JWT_SECRET not properly configured!');
    console.error('   → Set a strong random value for JWT_SECRET');
    console.error('   → Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    hasErrors = true;
  } else {
    console.log('   ✅ JWT_SECRET is configured');
  }
  
  // Check 3: DB_PASSWORD is set
  if (!envContent.includes('DB_PASSWORD=') || envContent.includes('DB_PASSWORD=your_database_password')) {
    console.warn('   ⚠️  WARNING: DB_PASSWORD might not be configured');
    hasWarnings = true;
  } else {
    console.log('   ✅ DB_PASSWORD is configured');
  }
  
  // Check 4: NODE_ENV for production
  if (process.env.NODE_ENV === 'production') {
    if (!envContent.includes('NODE_ENV=production')) {
      console.error('   ❌ ERROR: NODE_ENV should be set to "production"');
      hasErrors = true;
    } else {
      console.log('   ✅ NODE_ENV is set to production');
    }
  }
}

// Check 5: Dependencies
console.log('\n2️⃣  Checking dependencies...');
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  const requiredSecurityPackages = ['helmet', 'express-rate-limit', 'bcrypt', 'express-validator'];
  
  const missingPackages = requiredSecurityPackages.filter(pkg => !packageJson.dependencies[pkg]);
  
  if (missingPackages.length > 0) {
    console.error(`   ❌ ERROR: Missing security packages: ${missingPackages.join(', ')}`);
    hasErrors = true;
  } else {
    console.log('   ✅ All required security packages are installed');
  }
} catch (error) {
  console.error('   ❌ ERROR: Could not read package.json');
  hasErrors = true;
}

// Check 6: .gitignore
console.log('\n3️⃣  Checking .gitignore...');
const gitignorePath = join(__dirname, '..', '.gitignore');
if (!existsSync(gitignorePath)) {
  console.error('   ❌ ERROR: .gitignore file not found!');
  hasErrors = true;
} else {
  const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
  if (!gitignoreContent.includes('.env')) {
    console.error('   ❌ ERROR: .env is not in .gitignore!');
    console.error('   → Add .env to .gitignore immediately');
    hasErrors = true;
  } else {
    console.log('   ✅ .env is properly ignored by git');
  }
}

// Check 7: File permissions (Unix-like systems only)
if (process.platform !== 'win32') {
  console.log('\n4️⃣  Checking file permissions...');
  if (existsSync(envPath)) {
    try {
      const { execSync } = await import('child_process');
      const perms = execSync(`stat -c %a ${envPath}`).toString().trim();
      if (perms !== '600' && perms !== '400') {
        console.warn(`   ⚠️  WARNING: .env file permissions are ${perms}`);
        console.warn('   → Recommended: chmod 600 .env');
        hasWarnings = true;
      } else {
        console.log('   ✅ .env file permissions are secure');
      }
    } catch (error) {
      console.warn('   ⚠️  Could not check file permissions');
    }
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Security check FAILED! Please fix the errors above.');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Security check passed with warnings.');
  console.warn('   Please review the warnings above.');
  process.exit(0);
} else {
  console.log('✅ All security checks passed!');
  process.exit(0);
}
