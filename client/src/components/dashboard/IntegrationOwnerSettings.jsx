import { useState } from 'react';
import { ExternalLink, LoaderCircle, LockKeyhole, Save } from 'lucide-react';
import {
  getIntegrationAdminProviders,
  removeIntegrationAdminProvider,
  saveIntegrationAdminProvider,
  startIntegrationAdminSession,
} from '../../features/integrations/api.js';

const providerDetails = {
  github: {
    name: 'GitHub',
    url: 'https://github.com/settings/developers',
    clientIdName: 'GITHUB_CLIENT_ID',
    clientSecretName: 'GITHUB_CLIENT_SECRET',
  },
  jira: {
    name: 'Jira',
    url: 'https://developer.atlassian.com/console/myapps/',
    clientIdName: 'JIRA_CLIENT_ID',
    clientSecretName: 'JIRA_CLIENT_SECRET',
  },
  notion: {
    name: 'Notion',
    url: 'https://www.notion.so/profile/integrations',
    clientIdName: 'NOTION_CLIENT_ID',
    clientSecretName: 'NOTION_CLIENT_SECRET',
  },
};

export default function IntegrationOwnerSettings() {
  const [adminSecret, setAdminSecret] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [providers, setProviders] = useState(null);
  const [forms, setForms] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { token } = await startIntegrationAdminSession(adminSecret);
      const result = await getIntegrationAdminProviders(token);
      setAdminToken(token);
      setProviders(result.integrations);
      setAdminSecret('');
      setMessage('Owner access is active for 30 minutes.');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  async function save(provider) {
    const credentials = forms[provider] || {};
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await saveIntegrationAdminProvider(adminToken, provider, credentials);
      const result = await getIntegrationAdminProviders(adminToken);
      setProviders(result.integrations);
      setForms((current) => ({ ...current, [provider]: { clientId: '', clientSecret: '' } }));
      setMessage(`${providerDetails[provider].name} OAuth is ready for all users to connect.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(provider) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await removeIntegrationAdminProvider(adminToken, provider);
      const result = await getIntegrationAdminProviders(adminToken);
      setProviders(result.integrations);
      setForms((current) => ({ ...current, [provider]: { clientId: '', clientSecret: '' } }));
      setMessage(`${providerDetails[provider].name} OAuth configuration removed.`);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setAdminToken('');
    setProviders(null);
    setForms({});
    setMessage('Owner session ended.');
  }

  return (
    <section className="panel setup-panel integration-owner-settings">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">APP OWNER ONLY</div>
          <h2>Shared OAuth connections</h2>
          <p>
            Configure each provider once. Users can then connect their own accounts without entering
            OAuth app credentials.
          </p>
        </div>
      </div>
      {error && (
        <div className="provider-activity-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <p className="inline-success" role="status">
          {message}
        </p>
      )}
      {!providers ? (
        <form className="integration-admin-login" onSubmit={signIn}>
          <label htmlFor="integration-admin-secret">Owner admin secret</label>
          <input
            id="integration-admin-secret"
            type="password"
            autoComplete="current-password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
            required
          />
          <small>
            Set <code>INTEGRATION_ADMIN_SECRET</code> on the API server. Use this page over HTTPS;
            the secret is not saved in browser storage.
          </small>
          <button className="button button-dark" disabled={busy || !adminSecret}>
            {busy ? <LoaderCircle className="spin" size={14} /> : <LockKeyhole size={14} />} Unlock
            owner settings
          </button>
        </form>
      ) : (
        <>
          <div className="integration-owner-grid">
            {Object.entries(providerDetails).map(([provider, details]) => {
              const status = providers[provider] || {};
              const values = forms[provider] || { clientId: '', clientSecret: '' };
              return (
                <article className="integration-owner-card" key={provider}>
                  <h3>{details.name}</h3>
                  <a href={details.url} target="_blank" rel="noreferrer">
                    Create/manage OAuth app <ExternalLink size={12} />
                  </a>
                  <p>Callback URL</p>
                  <code>{status.callbackUrl}</code>
                  {status.source === 'environment' ? (
                    <p className="setup-owner-status">
                      {status.configured
                        ? 'Configured on the server with environment variables.'
                        : 'Environment credentials are incomplete or the OAuth encryption key is missing.'}
                    </p>
                  ) : (
                    <>
                      <p className="setup-owner-status">
                        {status.configured
                          ? `Configured · client ID ${status.clientId}`
                          : 'Not configured yet'}
                      </p>
                      <label>
                        Client ID
                        <input
                          autoComplete="off"
                          value={values.clientId}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [provider]: { ...values, clientId: event.target.value },
                            }))
                          }
                          placeholder={details.clientIdName}
                        />
                      </label>
                      <label>
                        Client secret
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={values.clientSecret}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [provider]: { ...values, clientSecret: event.target.value },
                            }))
                          }
                          placeholder={details.clientSecretName}
                        />
                      </label>
                      <button
                        type="button"
                        className="button button-dark"
                        disabled={busy || !values.clientId?.trim() || !values.clientSecret?.trim()}
                        onClick={() => save(provider)}
                      >
                        {busy ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}{' '}
                        Save {details.name}
                      </button>
                      {status.source === 'admin' && (
                        <button
                          type="button"
                          className="small-button"
                          disabled={busy}
                          onClick={() => remove(provider)}
                        >
                          Remove stored configuration
                        </button>
                      )}
                    </>
                  )}
                  <small>
                    Credentials are encrypted in the database. Keep the API encryption key backed
                    up; environment variables take precedence.
                  </small>
                </article>
              );
            })}
          </div>
          <button type="button" className="small-button" onClick={signOut}>
            Lock owner settings
          </button>
        </>
      )}
    </section>
  );
}
