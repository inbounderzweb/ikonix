// src/utils/password.js
// Standard-level password policy: at least 8 characters, with a mix of
// upper/lower case, a number, and a special character.
const CHECKS = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'One number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

export function getPasswordChecks(password = '') {
  return CHECKS.map((c) => ({ label: c.label, passed: c.test(password) }));
}

export function isStrongPassword(password = '') {
  return CHECKS.every((c) => c.test(password));
}

// 0-5 scale (number of criteria met) for a simple strength meter.
export function getPasswordScore(password = '') {
  if (!password) return 0;
  return CHECKS.filter((c) => c.test(password)).length;
}

export function getPasswordStrengthLabel(score) {
  if (score <= 1) return 'Very weak';
  if (score === 2) return 'Weak';
  if (score === 3) return 'Fair';
  if (score === 4) return 'Good';
  return 'Strong';
}
