import nodemailer from 'nodemailer';
import { config, mailConfigured } from '../config.js';
import { logger } from '../utils/logger.js';

let transporter = null;

export function getTransporter() {
  if (!transporter && mailConfigured) {
    const isGmail = config.smtp.host?.includes('gmail.com');
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass?.trim(),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      ...(isGmail ? { service: 'gmail' } : {}),
    });
  }
  return transporter;
}

export function resetTransporter() {
  transporter = null;
}

export async function verifyEmailService() {
  if (!mailConfigured) {
    return {
      configured: false,
      message: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env.',
    };
  }

  const transport = getTransporter();
  try {
    await transport.verify();
    return { configured: true, ok: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    const isGmail = config.smtp.host?.includes('gmail.com');
    let help = err.message;
    if (isGmail && (err.code === 'EAUTH' || err.responseCode === 535)) {
      help =
        'Gmail authentication failed. Google accounts require a 16-character App Password (not your normal password). ' +
        'Enable 2-Step Verification on your Google Account, generate an App Password at https://myaccount.google.com/apppasswords, and paste it into SMTP_PASS in server/.env.';
    }
    logger.warn(`SMTP verification failed: ${help}`);
    return { configured: true, ok: false, error: err.message, help };
  }
}

export async function sendEmail({ to, subject, text, html }) {
  if (!mailConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured.');
    }
    logger.info(`[Email Service - Simulated] To: ${to} | Subject: ${subject}\n${text}`);
    return { simulated: true, to, subject };
  }

  const transport = getTransporter();
  try {
    const info = await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email delivered to ${to} (${subject}) - ID: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const isGmail = config.smtp.host?.includes('gmail.com');
    if (isGmail && (err.code === 'EAUTH' || err.responseCode === 535)) {
      logger.warn(
        `Gmail SMTP failed for ${to}: Requires a 16-character App Password from https://myaccount.google.com/apppasswords.`
      );
    }
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        `Email delivery failed (${err.message}). Fallback to console in dev:\nTo: ${to}\nSubject: ${subject}\n${text}`
      );
      return { ok: false, error: err.message, simulated: true };
    }
    throw err;
  }
}

