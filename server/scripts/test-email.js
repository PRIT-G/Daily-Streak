import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { verifyEmailService, sendEmail } from '../src/services/emailService.js';
import { config } from '../src/config.js';

console.log('--- Email Service Diagnostic ---');
console.log('SMTP Host:', config.smtp.host || '(not set)');
console.log('SMTP Port:', config.smtp.port || '(not set)');
console.log('SMTP Secure:', config.smtp.secure);
console.log('SMTP User:', config.smtp.user || '(not set)');
console.log('From Address:', config.smtp.from);
console.log('');

console.log('1. Checking SMTP connection verification...');
const verification = await verifyEmailService();
console.log('Result:', verification);

if (verification.ok) {
  console.log('\n2. Sending test email to:', config.smtp.user);
  const sendResult = await sendEmail({
    to: config.smtp.user,
    subject: 'Daily Streak Tracker - SMTP Test Successful',
    text: 'Congratulations! Your SMTP email servicing is active and working perfectly.',
  });
  console.log('Send result:', sendResult);
} else {
  console.log('\nRecommendation:');
  console.log(verification.help || verification.error);
}
