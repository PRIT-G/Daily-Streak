import nodemailer from 'nodemailer';
import { config, mailConfigured } from '../config.js';
import { logger } from '../utils/logger.js';

const transport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass }
});

export async function sendAuthEmail({ to, subject, text }) {
  if (!mailConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured.');
    }
    logger.warn(`Auth email (SMTP not configured) for ${to} — ${subject}:\n${text}`);
    return;
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, text });
}
