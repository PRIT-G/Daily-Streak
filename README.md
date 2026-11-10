# Daily Streak

A standalone JavaScript MERN app for tracking daily coding activity, goals, streaks, and milestone badges using public coding profiles, with optional authorized GitHub activity.

The public website positions Daily Streak as a free early-access workspace for coding practice and student productivity. No payment information is collected. Public product details, service status, and startup instructions are available from the landing page and the signed-in **Setup & startup** section.

## Requirements

- Node.js 20+
- MongoDB (local MongoDB Community Server or a MongoDB-compatible URI)
- SMTP credentials for production account verification and recovery emails; optional during local development

## Run locally

1. Install Node.js 20+ and start MongoDB locally, or create a MongoDB Atlas database and copy its connection string.
2. From the project root, copy `server/.env.example` to `server/.env`. Set `MONGODB_URI` and replace `JWT_SECRET` with a private random value. Generate one with:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Install dependencies from the project root: `npm install`.
4. Start both the Express API and Vite frontend from the project root: `npm run dev`.
5. Open <http://localhost:5173>. Check API and database readiness at <http://localhost:4000/api/health>; the health response reports `database.connected: true` when MongoDB is ready.
6. Register an account, then connect public usernames for GitHub, LeetCode, Codeforces, and/or GitLab in **Settings → Connections** and refresh.

On Windows, if MongoDB Community Server was installed as a service, start PowerShell as Administrator and run `Start-Service MongoDB`. To create the local environment file from PowerShell, use `Copy-Item server\.env.example server\.env`, then edit it with `notepad server\.env`. The app's **Setup & startup** page contains the local startup steps, live API/database checks, all environment variables, optional services, and production checklist.

The browser stores the signed-in session token. New accounts must explicitly accept the early-access data notes; the accepted terms version and timestamp are stored with the account. Users can download an account JSON export and delete their account from Settings after re-entering their password. Deletion removes the account's activity, private activity entries, planner tasks, uploaded badges, and saved integration credentials. Private activity entries are only available through authenticated account routes and count toward the user's private streak/dashboard. Email verification and password recovery are built in. Production requires SMTP so new accounts can verify their email before signing in and users can receive password-reset links. For local development without SMTP, accounts are automatically marked verified and password-reset links are written to the server log; do not use that mode for a public deployment. Provider usernames are public profile names; the app never asks for provider passwords or scrapes authenticated pages. The API requires MongoDB to register and load account data.

During local development, the client sends `/api` requests through Vite's proxy to the backend on port 4000; this avoids browser CORS and `localhost` hostname mismatches. When the client is hosted separately in production, set `VITE_API_URL` to the backend API base URL, for example `https://api.example.com/api`.

## Configuration

See `server/.env.example`. `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN` are required for normal local use. `JWT_SECRET` must be replaced with a long random value outside local development. Production also requires working `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` values; the API refuses to start without them. Reminder time is interpreted as UTC. Reminders are saved but will not send without valid SMTP configuration. `CLIENT_ORIGIN` should match the frontend origin. Never commit `server/.env`; it is gitignored.

## Security & Production Hardening

- **Graceful Shutdown**: The API server traps `SIGTERM` and `SIGINT`, halts the reminder cron runner, drains in-flight HTTP connections, and closes MongoDB connections cleanly.
- **Session Invalidation**: When a user changes or resets their password, `passwordChangedAt` is updated on the user record and tokens issued prior to that timestamp are immediately rejected by authentication middleware.
- **Content Security Policy & Rate Limiting**: Helmet applies a strict CSP whitelist, public badge gallery endpoints are rate-limited to protect against denial-of-service/scraping, and all authenticated API routes share a 300-requests-per-15-minutes limiter keyed by the JWT user id (IP fallback for unauthenticated traffic) in addition to the stricter auth limiter.
- **Refresh Token Rotation**: Sign-in issues a short-lived access token (default 1h, `JWT_ACCESS_EXPIRES_IN`) plus a rotating refresh token (default 30d, `JWT_REFRESH_EXPIRES_IN`) stored as a SHA-256 hash on the user record. The client transparently refreshes on 401 and retries once; `POST /api/auth/logout` revokes the session, and password reset clears all refresh tokens.
- **Login Lockout & Audit Log**: Five failed logins per email trigger a 15-minute lockout with a per-email rate limiter. Security-relevant events (sign-up, login, verification, password reset, account export/delete, provider connect/refresh, settings changes) are written to the `AuditLog` collection with user, action, metadata, and IP.
- **Streak Freeze**: Users can enable streak freeze in Settings. Shields are earned per 7 days of longest streak (max 5) and automatically cover recent missed days within a 14-day window, bridged inside the streak calculation.
- **Weekly Digest & CSV Export**: Users can opt into a Sunday weekly digest email (streak, consistency, recommendations) and download their activity history as CSV from Settings → Your account data.
- **Public Profiles & Leaderboard**: Opting in via Settings publishes a read-only streak card at `#/u/{userId}` and enters the user on the weekly consistency leaderboard at `#/leaderboard`. Only display name, streaks, consistency score, and badge counts are exposed.
- **Webhook Ingestion**: Users can generate a per-user webhook secret in Settings and POST activity to `/api/webhooks/activity` (`{ secret, count, date, type, title }`) to record private activity from scripts, CI, or other tools. Secrets are stored hashed and can be revoked.
- **Background Sync Queue**: `POST /api/providers/:provider/refresh?background=1` and `POST /api/providers/sync-all` enqueue Mongo-backed sync jobs processed by a worker (15s poll, 3 attempts with backoff) instead of blocking the request.
- **API Versioning**: All routes are also mounted under `/api/v1/*` alongside the unversioned paths.
- **PWA**: A web app manifest and service worker (app-shell cache, network-first navigations, stale-while-revalidate assets, API never cached) are served from `client/public`; registration is skipped on localhost.
- **Request Logging**: Every API request is logged with method, path, status code, and duration through the shared Winston logger; production log level filters routine request lines to warnings and errors.
- **JWT Storage Considerations**: In the default single-page app configuration, JWT tokens are stored in the browser's `localStorage` for simplicity across development workflows. For high-security multi-tenant production deployments, consider configuring the API to issue `HttpOnly`, `Secure`, and `SameSite` cookies with CSRF token protection to eliminate script-level access risks.

## Data and provider limitations

- GitHub uses the public contribution calendar on the profile page to import daily contribution counts for the current and previous four years. Select the calendar year in the dashboard to view older activity. This includes the contributions GitHub chooses to show on that public graph; private activity is only included if GitHub exposes it on the profile. GitHub may change this undocumented page format, in which case sync reports a provider error rather than showing a false successful import.
- The Activity page has separate GitHub and LeetCode detail views. Optional GitHub OAuth displays authorized account events, repository names, commits, pull requests, reviews, issues, and merge information. GitHub limits this endpoint to at most 300 recent events (typically 90 days); it is not a full lifetime history, and merge-conflict state is shown only when GitHub reports it.
- GitHub authorization defaults to public account access. Users can explicitly opt in to private repository access; the `repo` scope is broad and may grant write-capable GitHub permissions, although this app only makes read requests. Private repository names are listed after consent, and private commit/PR data is fetched only for selected repositories (up to five at a time; up to 100 recent commits and pull requests per repository).
- Users can add individual private activity entries under **Activity → Private activity**. These entries are account-private, included in the authenticated dashboard and account export, count toward streaks and goals, and are deleted with the account.
- LeetCode's public GraphQL profile/calendar and recent-submission endpoints are unofficial and may change or reject requests. Its activity view displays the limited recent public submissions and available problem number, status, difficulty, and topic tags; it cannot promise a complete submission history. Daily LeetCode activity comes from its public submission calendar, not authenticated scraping.
- Codeforces activity comes from the public `user.status` API and counts submissions by UTC day. The API request is capped at its latest 10,000 submissions, so sync is limited to the current year and very high-volume accounts may have incomplete counts.
- GitLab activity comes from the public GitLab.com REST API and counts public user events by UTC day (pushes count commits where available). Each calendar year is paginated up to 10,000 events; larger histories report a sync error rather than claiming a complete import.
- Activity from each source is stored separately and merged by UTC day for combined streaks and goals. Counts are best-effort public contribution/submission counts; a goal is considered met when the day's combined count reaches the configured target.
- The signed-in dashboard includes a personal student planner for assignments, exams, and study sessions. Tasks are private to the account and can be created, edited, completed, filtered, and deleted; optional course names and due dates are supported.
- Milestones include automatically earned streak badges and a private gallery for badges earned on other platforms. Upload PNG, JPEG, or WebP images up to 1 MB with an optional platform name; uploaded images are stored with the account in MongoDB. Automatic import requires the platform's own authorized integration, so image upload does not claim to verify external awards.
- Dashboard responses include uploaded badge metadata only. The badge images are fetched through an authenticated endpoint when the Milestones page is opened, keeping image bytes out of routine dashboard loads. Dashboard activity queries select only fields needed for progress calculations.
- Dashboard navigation separates Overview, Insights, Activity, Study Planner, and Milestones into focused views. Overview keeps progress, today’s goal, and a short recent-activity preview; the other tabs show their full section.
- The Insights page computes a 30-day consistency score, active/goal day counts, average daily activity, best day (90-day lookback), week-over-week goal comparison, top activity sources, next streak milestone, streak risk, a least-squares streak-length forecast, a 30-day anomaly check versus the prior 30 days, a suggested daily goal based on the 90-day median, weekday activity patterns in the heatmap, rule-based recommendations, and provider data-quality status (connected count and syncs older than 7 days). Insights are derived from the same activity data as the dashboard and add no extra database queries.
- Work hub connects Jira and Notion with OAuth. Jira shows issues assigned to the signed-in user and supports workflow transitions and assignee changes. Notion lets the user browse pages, select a shared task database, and create/update its title, status, and due-date properties when those properties exist.
- The Work hub loads assigned Jira issues in pages of 50, Notion search results in pages of 50 per type, and database tasks in pages of 100. Use the load-more controls to continue through larger workspaces. When Jira OAuth grants access to multiple sites, choose the active site from the Jira section. Private activity entries are cursor-paginated (`?before=YYYY-MM-DD&limit=N`, default 200, max 500).

## Adding an activity provider

Provider integrations are registered in `server/src/providers/registry.js`. Each entry supplies a label, the years to synchronize, and a `fetchActivity(username, year)` adapter that returns `{ "YYYY-MM-DD": count }`. The shared provider service handles connection status, refresh, replacement of that provider's saved counts, and error reporting. Provider connections are stored as a keyed map, and activity counts are stored under each day's `sources` object; the dashboard still returns the legacy GitHub and LeetCode fields for compatibility.

GitHub year requests run in batches of two to shorten sync time without launching all requests at once. Providers that do not specify a concurrency limit remain sequential, which is safer for paginated APIs such as GitLab.

For a new provider, add its adapter and registry entry, then add its public display name/icon in `client/src/features/providers/catalog.js` if it needs a branded mark. The connections screen and source-specific calendar are driven by the provider records returned by the API, so they do not need provider-specific component changes. OAuth providers and incoming log/webhook sources need their own authorization or ingestion endpoint instead of the public-username flow; keep those credentials out of activity records and public API responses.

Student planner data and uploaded badge records are stored separately from coding activity. Their authenticated APIs are mounted at `/api/tasks` and `/api/badges`; each query and update is scoped to the signed-in account. Badge image uploads use a route-specific 2 MB JSON body limit and strict file type/size checks.

An account owner can explicitly enable a public badge gallery in **Milestones**. The private, authenticated `POST /api/badges/gallery` endpoint issues a 256-bit random gallery key; `DELETE /api/badges/gallery` revokes it. Anyone with the key can list that account's uploaded badge titles/platforms at `GET /api/public/badges/{galleryKey}`. The response provides direct image paths at `/api/public/badges/{galleryKey}/{badgeId}/image`; those unauthenticated GET endpoints return the image bytes with its verified image content type, so the URLs can be opened or used in `<img src="...">`. The public API never returns account details or automatically earned streak badges. Disable the gallery to revoke both listing and image access; image responses are cacheable for up to 60 seconds.

## Shared OAuth setup for GitHub, Jira, and Notion

The app owner registers one OAuth app per provider and configures its credentials once. Every user then connects their own provider account from **Activity → GitHub activity** or **Work hub**; regular users do not need to create OAuth apps or enter client credentials. OAuth apps cannot be created automatically by the site, so the owner must register them with GitHub, Atlassian, and Notion.

1. Set `API_PUBLIC_URL` to the public base URL of the API (locally, `http://localhost:4000`) and register these exact callback URLs in each provider app:
   - `{API_PUBLIC_URL}/api/integrations/github/callback`
   - `{API_PUBLIC_URL}/api/integrations/jira/callback`
   - `{API_PUBLIC_URL}/api/integrations/notion/callback`
2. Set `INTEGRATION_TOKEN_ENCRYPTION_KEY` to a random 32-byte key encoded as 64 hex characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. It encrypts provider tokens and credentials stored in MongoDB; keep it backed up and private.
3. Set `INTEGRATION_ADMIN_SECRET` to a separate private random value of at least 32 characters. From **Setup & startup → Shared OAuth connections**, the owner enters this secret to unlock settings for 30 minutes. Do not share it with ordinary users.
4. Configure provider client IDs and secrets either in the hosting secret manager / `server/.env` (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET`, `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`) or in the protected owner settings screen. Environment variables take precedence. The screen encrypts credentials at rest in MongoDB.
5. GitHub needs a GitHub OAuth App. The app requests `read:user` by default. Private repository access remains an explicit per-user opt-in; its `repo` scope is broad even though Daily Streak makes read-only API requests. Jira needs an Atlassian OAuth 2.0 (3LO) app with `offline_access`, `read:jira-user`, `read:jira-work`, and `write:jira-work`. Notion needs a public OAuth integration; each user shares pages/databases with it as needed.

After the owner configures a provider, users can click **Connect** from its activity/workspace view and authorize their own account. Jira status changes use available workflow transitions (not arbitrary status writes). Notion task editing adapts to the selected database schema. Removing a user's connection deletes that user's stored provider credentials.

## Tests and build

- `npm test` runs backend unit and API tests without requiring MongoDB, plus client component tests (Vitest + Testing Library) in `client/`.
- `npm run lint` runs ESLint (flat config, React plugin) and `npm run format`/`format:check` run Prettier.
- `npm run build` builds the Vite frontend.
- `npm audit` gates CI at the `high` severity level; Dependabot keeps npm dependencies updated.
- `load/k6-dashboard.js` is a k6 load script for the dashboard endpoint: `k6 run -e BASE_URL=http://localhost:4000 -e TOKEN=<jwt> load/k6-dashboard.js`.

## Project layout

```text
client/
  src/
    App.jsx                         App-level composition and auth/loading states
    hooks/useDailyStreak.js         Session, dashboard state, and user actions
    features/
      auth/api.js                   Authentication API calls
      dashboard/api.js              Dashboard and settings API calls
      dashboard/tasksApi.js         Student planner task API calls
      providers/api.js              Provider connection and sync API calls
    components/
      AuthScreen.jsx                Sign-in and registration UI
      Heatmap.jsx                   Activity calendar
      SettingsPanel.jsx             Goals, reminders, and provider settings
      dashboard/                    Dashboard layout, per-source charts, and focused display components
        StudentPlanner.jsx          Course-aware assignments, exams, and study task planner
        ActivityLists.jsx            Recent activity and earned/uploaded milestone gallery

server/
  src/
    app.js                          Express middleware and route mounting
    routes/                         HTTP endpoints and request validation
    services/                       Authentication, dashboard, provider sync, reminders
    models/                         Mongoose schemas, including private uploaded milestone badges
    providers/                      Provider registry and GitHub/LeetCode adapters
    middleware/                     Authentication and request middleware
    utils/                          Shared streak, badge, and domain helpers
  test/                             API, provider, and streak tests
```

The client follows a feature-oriented structure: `App.jsx` wires the top-level states,
the `useDailyStreak` hook owns application state and actions, API modules are grouped
by feature, and dashboard sections are composed from focused components in
`components/dashboard/`. Keep display-only components independent of transport and
database details.

The API follows a route/service/model separation. Routes validate HTTP input and shape
responses, services own business workflows and database operations, models define
stored data, and provider adapters isolate external APIs. Add new backend behavior to
the relevant service and route rather than expanding `app.js`.
