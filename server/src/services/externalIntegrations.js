import { config } from '../config.js';
import ExternalIntegration from '../models/ExternalIntegration.js';
import IntegrationProviderConfig from '../models/IntegrationProviderConfig.js';
import { decryptToken, encryptToken } from './integrationSecurity.js';

const NOTION_VERSION = '2022-06-28';
const PROVIDER_REQUEST_TIMEOUT_MS = 12000;

async function providerFetchWithTimeout(url, options, provider) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      const timeoutError = new Error(`${provider} did not respond in time. Please try again.`);
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  }
}

function publicProviderData(provider, data = {}) {
  if (provider === 'jira') {
    return {
      siteName: data.siteName || '',
      siteUrl: data.siteUrl || '',
      cloudId: data.cloudId || '',
      sites: Array.isArray(data.sites)
        ? data.sites.map((site) => ({
          cloudId: site.cloudId || '',
          siteName: site.siteName || '',
          siteUrl: site.siteUrl || ''
        }))
        : []
    };
  }
  if (provider === 'github') {
    return {
      login: data.login || '',
      avatarUrl: data.avatarUrl || '',
      profileUrl: data.profileUrl || '',
      privateAccess: Boolean(data.privateAccess)
    };
  }
  return {
    workspaceName: data.workspaceName || '',
    workspaceId: data.workspaceId || '',
    botId: data.botId || ''
  };
}

export async function listIntegrationStatuses(userId) {
  const records = await ExternalIntegration.find({ userId }).select('provider providerData').lean();
  const result = {
    jira: { connected: false, callbackUrl: callbackUrl('jira') },
    notion: { connected: false, callbackUrl: callbackUrl('notion') },
    github: { connected: false, callbackUrl: callbackUrl('github') }
  };
  for (const record of records) {
    result[record.provider] = {
      connected: true,
      callbackUrl: callbackUrl(record.provider),
      ...publicProviderData(record.provider, record.providerData)
    };
  }
  await Promise.all(Object.keys(result).map(async (provider) => {
    const credentials = await getProviderCredentials(provider);
    result[provider].configured = /^[a-f\d]{64}$/i.test(config.integrations.encryptionKey) &&
      Boolean(credentials.id && credentials.secret);
    result[provider].configurationSource = credentials.source;
  }));
  return result;
}

function environmentCredentials(provider) {
  if (provider === 'jira') {
    return { id: config.integrations.jiraClientId, secret: config.integrations.jiraClientSecret };
  }
  if (provider === 'notion') {
    return { id: config.integrations.notionClientId, secret: config.integrations.notionClientSecret };
  }
  return { id: config.integrations.githubClientId, secret: config.integrations.githubClientSecret };
}

export async function getProviderCredentials(provider) {
  const environment = environmentCredentials(provider);
  if (environment.id || environment.secret) return { ...environment, source: 'environment' };
  if (!/^[a-f\d]{64}$/i.test(config.integrations.encryptionKey)) {
    return { id: '', secret: '', source: null };
  }
  const stored = await IntegrationProviderConfig.findOne({ provider })
    .select('+clientId +clientSecret')
    .lean();
  if (!stored) return { id: '', secret: '', source: null };
  return {
    id: decryptToken(stored.clientId),
    secret: decryptToken(stored.clientSecret),
    source: 'admin'
  };
}

export async function isConfigured(provider) {
  if (!/^[a-f\d]{64}$/i.test(config.integrations.encryptionKey)) return false;
  const credentials = await getProviderCredentials(provider);
  return Boolean(credentials.id && credentials.secret);
}

export async function saveProviderCredentials(provider, clientId, clientSecret) {
  const update = {
    clientId: encryptToken(clientId),
    clientSecret: encryptToken(clientSecret)
  };
  await IntegrationProviderConfig.findOneAndUpdate(
    { provider },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function removeProviderCredentials(provider) {
  await IntegrationProviderConfig.deleteOne({ provider });
}

export function callbackUrl(provider) {
  return `${config.apiPublicUrl.replace(/\/+$/, '')}/api/integrations/${provider}/callback`;
}

export async function saveIntegration({ userId, provider, accessToken, refreshToken, expiresIn, providerData }) {
  const update = {
    accessToken: encryptToken(accessToken),
    refreshToken: refreshToken ? encryptToken(refreshToken) : '',
    expiresAt: Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000) : null,
    providerData: publicProviderData(provider, providerData)
  };
  await ExternalIntegration.findOneAndUpdate(
    { userId, provider },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function selectJiraSite(userId, cloudId) {
  const integration = await ExternalIntegration.findOne({ userId, provider: 'jira' });
  if (!integration) {
    const error = new Error('Jira is not connected.');
    error.status = 404;
    throw error;
  }
  const site = (integration.providerData?.sites || []).find((item) => item.cloudId === cloudId);
  if (!site) {
    const error = new Error('Choose a Jira site available to this connected account.');
    error.status = 400;
    throw error;
  }
  integration.providerData = {
    ...integration.providerData,
    cloudId: site.cloudId,
    siteName: site.siteName,
    siteUrl: site.siteUrl
  };
  await integration.save();
  return publicProviderData('jira', integration.providerData);
}

async function refreshJiraToken(integration) {
  if (!integration.refreshToken) {
    const error = new Error('Jira authorization expired. Disconnect and connect Jira again.');
    error.status = 401;
    throw error;
  }
  const credentials = await getProviderCredentials('jira');
  const response = await providerFetchWithTimeout('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: credentials.id,
      client_secret: credentials.secret,
      refresh_token: decryptToken(integration.refreshToken)
    })
  }, 'Jira');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const latest = await ExternalIntegration.findById(integration._id)
      .select('+accessToken +refreshToken');
    if (latest?.refreshToken !== integration.refreshToken &&
        latest?.expiresAt?.getTime() > Date.now() + 60_000) {
      integration.accessToken = latest.accessToken;
      integration.refreshToken = latest.refreshToken;
      integration.expiresAt = latest.expiresAt;
      return;
    }
    const error = new Error('Could not refresh Jira authorization. Disconnect and reconnect Jira.');
    error.status = 502;
    throw error;
  }
  integration.accessToken = encryptToken(payload.access_token);
  integration.refreshToken = payload.refresh_token ? encryptToken(payload.refresh_token) : integration.refreshToken;
  integration.expiresAt = new Date(Date.now() + Number(payload.expires_in || 3600) * 1000);
  await integration.save();
}

export async function getAccessToken(userId, provider) {
  const integration = await ExternalIntegration.findOne({ userId, provider })
    .select('+accessToken +refreshToken');
  if (!integration) {
    const name = provider === 'jira' ? 'Jira' : provider === 'github' ? 'GitHub' : 'Notion';
    const error = new Error(`${name} is not connected.`);
    error.status = 404;
    throw error;
  }
  if (provider === 'jira' && integration.expiresAt &&
      integration.expiresAt.getTime() < Date.now() + 60_000) {
    await refreshJiraToken(integration);
  }
  return {
    token: decryptToken(integration.accessToken),
    providerData: integration.providerData || {}
  };
}

async function providerFetch(url, options, provider) {
  const response = await providerFetchWithTimeout(url, options, provider === 'jira' ? 'Jira' : 'Notion');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = provider === 'jira'
      ? payload.errorMessages?.[0]
      : payload.message;
    const error = new Error(detail || `${provider === 'jira' ? 'Jira' : 'Notion'} request failed (${response.status}).`);
    error.status = response.status === 401 ? 401 : 502;
    throw error;
  }
  return payload;
}

export async function jiraRequest(userId, path, options = {}, accessContext = null) {
  const { token, providerData } = accessContext || await getAccessToken(userId, 'jira');
  if (!providerData.cloudId) throw new Error('Jira site is missing. Disconnect and reconnect Jira.');
  const url = `https://api.atlassian.com/ex/jira/${encodeURIComponent(providerData.cloudId)}${path}`;
  return providerFetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  }, 'jira');
}

export async function notionRequest(userId, path, options = {}) {
  const { token } = await getAccessToken(userId, 'notion');
  return providerFetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  }, 'notion');
}

export async function removeIntegration(userId, provider) {
  await ExternalIntegration.deleteOne({ userId, provider });
}
