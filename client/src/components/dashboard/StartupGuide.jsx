import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Server,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { apiUrl } from '../../api/index.js';
import IntegrationOwnerSettings from './IntegrationOwnerSettings.jsx';

function StatusCard({ icon: Icon, title, status, detail, ready }) {
  return (
    <article className={`setup-status-card ${ready ? 'is-ready' : 'is-waiting'}`}>
      <span className="setup-status-icon">
        <Icon size={18} />
      </span>
      <div>
        <strong>{title}</strong>
        <span className="setup-status-label">{status}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function SetupStep({ number, title, children }) {
  return (
    <article className="setup-step">
      <span className="setup-step-number">{number}</span>
      <div className="setup-step-content">
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  );
}

export default function StartupGuide() {
  const [health, setHealth] = useState({ state: 'checking', database: 'checking' });
  const [checkedAt, setCheckedAt] = useState('');

  async function checkHealth() {
    setHealth({ state: 'checking', database: 'checking' });
    try {
      const response = await fetch(apiUrl('/health'));
      const result = await response.json();
      setHealth({
        state: response.ok ? 'ready' : 'unavailable',
        database: result.database?.connected ? 'ready' : 'disconnected',
      });
    } catch {
      setHealth({ state: 'unavailable', database: 'unknown' });
    }
    setCheckedAt(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    checkHealth();
  }, []);

  const apiReady = health.state === 'ready';
  const databaseReady = health.database === 'ready';
  const apiHealthUrl = apiUrl('/health');

  return (
    <section className="page-section startup-guide">
      <div className="welcome-row">
        <div>
          <div className="eyebrow muted-eyebrow">
            <span className="eyebrow-dot" /> PROJECT ADMINISTRATION
          </div>
          <h1>
            Setup & startup<span className="wave">✳</span>
          </h1>
          <p>
            Everything needed to run Daily Streak locally, connect services, and prepare a
            deployment.
          </p>
        </div>
        <button className="button button-outline setup-refresh" onClick={checkHealth}>
          <Activity size={15} /> Check status
        </button>
      </div>

      <section className="setup-status-grid" aria-label="Project service status">
        <StatusCard
          icon={Server}
          title="API server"
          status={
            health.state === 'checking' ? 'Checking…' : apiReady ? 'Reachable' : 'Unavailable'
          }
          detail={
            apiReady
              ? `${apiHealthUrl}${checkedAt ? ` · checked ${checkedAt}` : ''}`
              : 'Start the backend with npm run dev.'
          }
          ready={apiReady}
        />
        <StatusCard
          icon={databaseReady ? CheckCircle2 : CircleAlert}
          title="MongoDB"
          status={
            health.database === 'checking'
              ? 'Checking…'
              : databaseReady
                ? 'Connected'
                : 'Not connected'
          }
          detail={
            databaseReady
              ? 'Accounts and planner data can be stored.'
              : 'Required to sign in, save tasks, and use the dashboard.'
          }
          ready={databaseReady}
        />
      </section>

      <section className="panel setup-panel">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">GET THE APP RUNNING</div>
            <h2>Local startup checklist</h2>
            <p>Run these steps from the project root folder in PowerShell.</p>
          </div>
        </div>
        <div className="setup-steps">
          <SetupStep number="1" title="Install the requirements">
            <p>
              Install <strong>Node.js 20 or newer</strong> and MongoDB Community Server, or prepare
              a MongoDB Atlas connection string. Then install the workspace packages once:
            </p>
            <pre>npm install</pre>
          </SetupStep>
          <SetupStep number="2" title="Create the server environment file">
            <p>
              Copy the template, then open <code>server\.env</code> and set a private JWT secret and
              your MongoDB connection string:
            </p>
            <pre>Copy-Item server\.env.example server\.env notepad server\.env</pre>
            <p>
              Keep this file private and never commit or share its contents. Generate a JWT secret
              locally with:
            </p>
            <pre>node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"</pre>
          </SetupStep>
          <SetupStep number="3" title="Start MongoDB">
            <p>
              MongoDB must be running before registering or signing in. If MongoDB Community Server
              is installed as a Windows service, run PowerShell as Administrator:
            </p>
            <pre>Start-Service MongoDB</pre>
            <p>
              Or set <code>MONGODB_URI</code> in <code>server\.env</code> to your Atlas connection
              string and ensure your IP is allowed in the Atlas network access rules.
            </p>
          </SetupStep>
          <SetupStep number="4" title="Start the app">
            <p>From the project root, start the API and frontend together:</p>
            <pre>npm run dev</pre>
            <p>
              Open the frontend at{' '}
              <a href="http://localhost:5173/" target="_blank" rel="noreferrer">
                http://localhost:5173/ <ExternalLink size={12} />
              </a>
              . The API health check is at{' '}
              <a href="http://localhost:4000/api/health" target="_blank" rel="noreferrer">
                http://localhost:4000/api/health <ExternalLink size={12} />
              </a>
              .
            </p>
            <p>
              Register or sign in after the health response reports{' '}
              <code>{'"database": { "connected": true }'}</code>.
            </p>
          </SetupStep>
        </div>
      </section>

      <section className="panel setup-panel">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">SERVER ENVIRONMENT</div>
            <h2>Configuration reference</h2>
            <p>
              Required values are needed for a working server; the others enable optional features.
            </p>
          </div>
        </div>
        <div className="setup-config-grid">
          <div>
            <span className="setup-config-tag required">Required</span>
            <strong>MONGODB_URI</strong>
            <p>
              MongoDB address; local default is in <code>server\.env.example</code>, or use the
              Atlas URI.
            </p>
          </div>
          <div>
            <span className="setup-config-tag required">Required</span>
            <strong>JWT_SECRET</strong>
            <p>
              Private session-signing key. Use a random value; production requires at least 32
              characters.
            </p>
          </div>
          <div>
            <span className="setup-config-tag required">Required</span>
            <strong>CLIENT_ORIGIN</strong>
            <p>
              Frontend origin allowed by the API, such as <code>http://localhost:5173</code>.
            </p>
          </div>
          <div>
            <span className="setup-config-tag optional">Optional</span>
            <strong>API_PUBLIC_URL</strong>
            <p>Public API base URL used to build Jira, Notion, and GitHub OAuth callback URLs.</p>
          </div>
          <div>
            <span className="setup-config-tag optional">Optional</span>
            <strong>INTEGRATION_ADMIN_SECRET</strong>
            <p>
              Private 32+ character owner key for the protected shared OAuth settings screen below.
            </p>
          </div>
          <div>
            <span className="setup-config-tag optional">Optional</span>
            <strong>JIRA / NOTION / GITHUB CLIENT ID + SECRET</strong>
            <p>
              Configure once here for everyone, or set provider variables on the server; environment
              values take precedence.
            </p>
          </div>
          <div>
            <span className="setup-config-tag optional">Required for OAuth</span>
            <strong>INTEGRATION_TOKEN_ENCRYPTION_KEY</strong>
            <p>
              Private 32-byte key encoded as 64 hex characters. Required for OAuth token storage and
              encrypted owner settings.
            </p>
          </div>
          <div>
            <span className="setup-config-tag required">Required in production</span>
            <strong>SMTP_HOST / USER / PASS</strong>
            <p>
              Required for production account verification and recovery emails. Also used for
              reminders and weekly digests; optional during local development.
            </p>
          </div>
        </div>
      </section>

      <IntegrationOwnerSettings />

      <section className="setup-optional-grid">
        <article className="panel setup-optional-card">
          <span className="work-provider-icon">
            <Wrench size={18} />
          </span>
          <div>
            <div className="panel-kicker">OPTIONAL SERVICES</div>
            <h2>Connect your tools</h2>
            <p>
              The app owner registers each provider once and configures the shared credentials
              above. Everyone else can connect their own account from <a href="#work">Work hub</a>{' '}
              or <a href="#activity">GitHub activity</a>.
            </p>
            <a
              className="setup-inline-link"
              href="https://developer.atlassian.com/console/myapps/"
              target="_blank"
              rel="noreferrer"
            >
              Atlassian app console <ExternalLink size={12} />
            </a>
            <a
              className="setup-inline-link"
              href="https://www.notion.so/profile/integrations"
              target="_blank"
              rel="noreferrer"
            >
              Notion integrations <ExternalLink size={12} />
            </a>
            <a
              className="setup-inline-link"
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Developer settings <ExternalLink size={12} />
            </a>
          </div>
        </article>
        <article className="panel setup-optional-card">
          <span className="work-provider-icon security">
            <ShieldCheck size={18} />
          </span>
          <div>
            <div className="panel-kicker">BEFORE DEPLOYING</div>
            <h2>Production checklist</h2>
            <ul>
              <li>Use HTTPS and a production MongoDB with backups.</li>
              <li>
                Set strong private <code>JWT_SECRET</code> and `INTEGRATION_TOKEN_ENCRYPTION_KEY`
                values.
              </li>
              <li>
                Configure working SMTP credentials for account verification, recovery, and email
                features.
              </li>
              <li>
                Set production <code>CLIENT_ORIGIN</code>, <code>API_PUBLIC_URL</code>, and frontend{' '}
                <code>VITE_API_URL</code>.
              </li>
              <li>Register production OAuth callback URLs with Jira and Notion.</li>
              <li>Store secrets in your hosting provider’s secret manager, not source control.</li>
            </ul>
          </div>
        </article>
      </section>
    </section>
  );
}
