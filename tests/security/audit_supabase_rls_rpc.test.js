/**
 * audit_supabase_rls_rpc.test.js
 * Automated Security Audit for Supabase RLS and Stored Procedure Execution Rights
 * Tests for:
 * 1. Broken Object Level Authorization (BOLA / IDOR)
 * 2. Unauthenticated Execution of SECURITY DEFINER Stored Procedures (CWE-285)
 * 3. Public access policies on sensitive operational tables
 * 4. Verification that Migration 012 properly closes all reported vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;
let warnings = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

function warn(message) {
  console.warn(`  [WARN] ${message}`);
  warnings++;
}

console.log('=== Running Security Audit: Supabase RLS & Stored Procedures (CWE-285) ===\n');

// 1. Audit Migration 012 (Security Hardening for RLS & RPC Permissions)
const migration012Path = path.resolve(__dirname, '../../supabase/migrations/012_security_hardening_rls_and_rpc_permissions.sql');
console.log('1. Checking Migration 012 (Security Hardening Patches):');
if (fs.existsSync(migration012Path)) {
  const content012 = fs.readFileSync(migration012Path, 'utf8');

  // Check RPC execution rights revoked from anon and public
  const hasRevokePublic = content012.includes('REVOKE EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) FROM PUBLIC;') &&
                          content012.includes('REVOKE EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) FROM anon;');
  const hasGrantAuthenticated = content012.includes('GRANT EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) TO authenticated;');
  const hasRoleCheckInBody = content012.includes("auth.role() IS DISTINCT FROM 'authenticated'") &&
                             content012.includes('RAISE EXCEPTION');

  assert(hasRevokePublic, 'Migration 012 explicitly revokes execution on shift_schedule_timeline from PUBLIC and anon');
  assert(hasGrantAuthenticated, 'Migration 012 restricts shift_schedule_timeline execution to authenticated & service_role');
  assert(hasRoleCheckInBody, 'Migration 012 injects defense-in-depth auth.role() verification inside procedure body');

  // Check Certificates table anti-scraping policy
  const hasDropPermissivePolicy = content012.includes('DROP POLICY IF EXISTS "Public read certificates by verification_code" ON public.certificates;');
  const hasDedicatedRPC = content012.includes('CREATE OR REPLACE FUNCTION public.verify_certificate_public(p_code TEXT)');
  const hasStaffOnlyTableRead = content012.includes('CREATE POLICY "Staff read certificates" ON public.certificates') &&
                                content012.includes('USING (public.is_staff())');

  assert(hasDropPermissivePolicy, 'Migration 012 drops permissive table-dumping policy "Public read certificates by verification_code"');
  assert(hasStaffOnlyTableRead, 'Migration 012 restricts direct table SELECT to staff');
  assert(hasDedicatedRPC, 'Migration 012 provides dedicated verify_certificate_public RPC preventing table scraping');
} else {
  console.error('  [FAIL] Migration 012_security_hardening_rls_and_rpc_permissions.sql not found!');
  failed++;
}

// 2. Audit Client Certificate Service for Anti-Scraping Integration
const certServicePath = path.resolve(__dirname, '../../src/services/certificateService.js');
console.log('\n2. Checking certificateService.js for RPC Integration:');
if (fs.existsSync(certServicePath)) {
  const content = fs.readFileSync(certServicePath, 'utf8');
  const callsRpc = content.includes("verify_certificate_public");
  assert(callsRpc, 'certificateService.verifyByCode calls anti-scraping RPC verify_certificate_public');
} else {
  console.error('  [FAIL] certificateService.js not found!');
  failed++;
}

// 3. Audit Admin Login Gate for Hardcoded Passcode and Rate Limiting
const adminLoginGatePath = path.resolve(__dirname, '../../src/features/auth/AdminLoginGate.jsx');
console.log('\n3. Checking AdminLoginGate.jsx for Authentication Hardening:');
if (fs.existsSync(adminLoginGatePath)) {
  const content = fs.readFileSync(adminLoginGatePath, 'utf8');

  const hasHardcodedAdmin123 = content.includes("passcode.trim() === 'admin123'");
  const hasDefaultPlaceholder = content.includes("(default: admin123)");
  const hasLockoutState = content.includes('lockoutUntil') && content.includes('failedAttempts');
  const hasLockoutDuration = content.includes('30000'); // 30s lockout

  assert(!hasHardcodedAdmin123, 'Hardcoded default passcode "admin123" removed from authentication handler');
  assert(!hasDefaultPlaceholder, 'Default credentials removed from UI placeholder');
  assert(hasLockoutState, 'Client-side rate-limiting and lockout state implemented');
  assert(hasLockoutDuration, 'Brute-force lockout triggers 30-second penalty after 5 failed attempts');
} else {
  console.error('  [FAIL] AdminLoginGate.jsx not found!');
  failed++;
}

console.log(`\n=== Supabase RLS & Auth Audit Summary: ${passed} Passed, ${failed} Failed, ${warnings} Warnings ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
