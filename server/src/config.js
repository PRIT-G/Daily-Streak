import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace-this-with-a-long-random-secret')) {
  throw new Error('Production requires a private JWT_SECRET of at least 32 characters.');
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/daily-streak-tracker',
  jwtSecret: process.env.JWT_SECRET || 'local-development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  integrations: {
    encryptionKey: process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY || '',
    adminSecret: process.env.INTEGRATION_ADMIN_SECRET || '',
    jiraClientId: process.env.JIRA_CLIENT_ID || '',
    jiraClientSecret: process.env.JIRA_CLIENT_SECRET || '',
    notionClientId: process.env.NOTION_CLIENT_ID || '',
    notionClientSecret: process.env.NOTION_CLIENT_SECRET || '',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || ''
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Daily Streak <noreply@example.com>'
  }
};

export const mailConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

if (process.env.NODE_ENV === 'production' && !mailConfigured) {
  throw new Error('Production requires SMTP_HOST, SMTP_USER, and SMTP_PASS for email verification and account recovery.');
}

if (process.env.NODE_ENV === 'production' &&
    (config.integrations.adminSecret || config.integrations.jiraClientId ||
      config.integrations.notionClientId || config.integrations.githubClientId) &&
    !/^[a-f\d]{64}$/i.test(config.integrations.encryptionKey)) {
  throw new Error('Production OAuth integrations require a 32-byte hex INTEGRATION_TOKEN_ENCRYPTION_KEY.');
}

if (process.env.NODE_ENV === 'production' &&
    config.integrations.adminSecret &&
    config.integrations.adminSecret.length < 32) {
  throw new Error('INTEGRATION_ADMIN_SECRET must contain at least 32 characters in production.');
}
