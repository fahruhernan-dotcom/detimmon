/**
 * run_all_security_tests.js
 * Runner for all Strix-style Security Audit Suites:
 * - CWE-1236: CSV / Formula Injection Neutralization
 * - CWE-285: Supabase RLS & Stored Procedure Execution Rights
 * - CWE-200: Public Endpoint PII Data Leakage
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  'audit_csv_injection.test.js',
  'audit_supabase_rls_rpc.test.js',
  'audit_public_pii_leakage.test.js'
];

console.log('🛡️  LPK DIGNITY COMMAND CENTER - STRIX SECURITY AUDIT SUITE');
console.log('===========================================================');

let allPassed = true;

for (const suite of suites) {
  const fullPath = path.join(__dirname, suite);
  console.log(`\n▶️  Executing: ${suite}`);
  try {
    const output = execSync(`node "${fullPath}"`, { stdio: 'inherit' });
  } catch (err) {
    allPassed = false;
    console.error(`❌ Suite failed: ${suite}`);
  }
}

console.log('\n===========================================================');
if (allPassed) {
  console.log('🎉 ALL SECURITY AUDIT SUITES PASSED! NO CRITICAL FLAWS DETECTED.');
  process.exit(0);
} else {
  console.error('⚠️  ONE OR MORE SECURITY AUDIT SUITES FAILED!');
  process.exit(1);
}
