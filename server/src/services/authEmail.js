import { sendEmail } from './emailService.js';

export async function sendAuthEmail({ to, subject, text }) {
  return sendEmail({ to, subject, text });
}
