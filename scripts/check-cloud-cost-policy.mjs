import {readFile} from 'node:fs/promises';

// Reject this repository's Functions deployment path; this is not an
// account-level billing lock. Keep source preparation and emulators available.
try {
  const policy = JSON.parse(await readFile(new URL('../deployment-policy.json', import.meta.url), 'utf8'));
  if (policy.billingMode !== 'paid-approved' || policy.paidServicesApproved !== true) {
    throw new Error('STAM is free-only. Cloud Functions requires billing and is not approved. Do not upgrade Firebase or change this policy without a new explicit user decision.');
  }
} catch (error) {
  console.error(`Cloud deployment blocked: ${error.message}`);
  process.exitCode = 1;
}
