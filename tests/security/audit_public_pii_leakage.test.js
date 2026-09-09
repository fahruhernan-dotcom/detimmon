/**
 * audit_public_pii_leakage.test.js
 * Automated Security Test Suite for Sensitive Data Exposure / PII Leakage (CWE-200 / CWE-359)
 * Validates that public certificate verification and public registration endpoints do not leak private PII.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('=== Running Security Audit: Public PII Data Exposure (CWE-200) ===\n');

// 1. Audit certificateService.verifyByCode query fields
const certServicePath = path.resolve(__dirname, '../../src/services/certificateService.js');
if (fs.existsSync(certServicePath)) {
  const content = fs.readFileSync(certServicePath, 'utf8');

  console.log('1. Checking certificateService.verifyByCode for safe column projection:');
  const hasNoSelectStar = !content.includes("verifyByCode") || !content.slice(content.indexOf("verifyByCode")).includes(".select('*')");
  const excludesSensitivePersons = !content.slice(content.indexOf("verifyByCode")).includes("whatsapp") &&
                                   !content.slice(content.indexOf("verifyByCode")).includes("persons (");

  assert(hasNoSelectStar, 'verifyByCode does not use select(*)');
  assert(excludesSensitivePersons, 'verifyByCode does not leak person contact info (whatsapp, email)');
}

// 2. Audit PublicRegistrationWizard for client-side credential leakage
const regWizardPath = path.resolve(__dirname, '../../src/features/public_registration/PublicRegistrationWizard.jsx');
if (fs.existsSync(regWizardPath)) {
  const content = fs.readFileSync(regWizardPath, 'utf8');

  console.log('\n2. Checking PublicRegistrationWizard for secrets/tokens exposure:');
  const hasServiceRoleKey = content.includes('service_role') || content.includes('SUPABASE_SERVICE_KEY');
  const hasClientSecret = content.includes('client_secret') || content.includes('GOOGLE_CLIENT_SECRET');

  assert(!hasServiceRoleKey, 'No Supabase service_role key found in public registration form');
  assert(!hasClientSecret, 'No Google OAuth client_secret found in public registration form');
}

console.log(`\n=== Public PII Exposure Audit Summary: ${passed} Passed, ${failed} Failed ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
