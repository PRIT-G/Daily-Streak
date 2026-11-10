# Product QA & Engineering Review

**Review date:** 2026-11-08  
**Scope:** Current app code and user-facing flows for authentication, dashboard, activity providers, planner, milestones, Jira/Notion setup, startup status, and email reminders. This is a risk-based review of the current implementation, not a guarantee that every possible defect has been found.

## Verification performed

- Ran `npm test`: 66 tests passed; ran `npm test -w client`: 5 tests passed.
- Ran `npm run build` and `npm run lint`: both passed.
- Checked the public landing page at a 320 CSS-pixel viewport; it rendered without horizontal page overflow.
- `npm run format:check` reports existing formatting differences across the repository; no repository-wide reformat was applied.
- Smoke-checked Overview, Activity, Study Planner, Milestones, Work hub, and Setup & startup in the running browser at a 320 CSS-pixel viewport; all six routes rendered without horizontal page overflow.
- Verified the configured Jira callback URL and loaded a private uploaded badge image in the running app.
- Did not exercise live Jira, Notion, SMTP, or a production deployment because those owner credentials/services are not configured in this environment.

## Confirmed findings fixed

| Priority | Finding | Resolution |
|---|---|---|
| High | Jira and Notion setup instructions always displayed a `localhost` OAuth callback, which cannot be registered for a hosted product. | The API now returns each callback URL from `API_PUBLIC_URL`; Work hub instructions use that configured URL. |
| High | Jira/Notion API and OAuth requests had no request deadline and could leave user actions waiting indefinitely when a provider stalled. | Added a 12-second timeout to external OAuth, token-refresh, and provider API requests; API timeouts return a clear 504 error. |
| Medium | Setup & startup reported `http://localhost:4000` as the reachable API even when the frontend was hosted elsewhere. | The status card now displays the API health URL configured for the current client. |
| Medium | Reminder email copy asked users to complete the full daily target even when they had already completed some activity. The job also queried activity once per matching account and could send duplicates across concurrent app instances. | Reminder copy uses the remaining activity count; activity is fetched in one query, and an atomic per-account daily claim prevents duplicate sends. Failed sends release the claim for retry. |
| Medium | A fixed page minimum width caused horizontal overflow on narrow mobile viewports. | Removed the fixed minimum width and checked the landing page at a 320px viewport. |
| Low | Jira and Notion silently capped issue/search/task results, making a partial list easy to mistake for the full workspace. | Jira issues and Notion page/database/task results now expose provider cursors and load-more controls. |

## Remaining product and launch risks

These are not treated as silently fixed: they require owner decisions, external credentials, or larger product work.

| Priority | Risk / limitation | Recommended next step |
|---|---|---|
| Resolved | Account export and self-service deletion were unavailable. | Settings now supports a JSON export and password-confirmed deletion. The landing page and README describe these controls and their current limits. |
| Resolved with deployment requirement | Password reset and email verification are implemented, but production could start without SMTP and silently skip verification for new accounts. | Production startup now requires SMTP credentials; local development can still run without SMTP. Verify delivery with the deployment's actual mail provider before launch. |
| Resolved in code; requires provider smoke test | Jira authorization previously selected the first Atlassian site without allowing users to choose another. | OAuth now stores the authorized site list, exposes an authenticated site selector, and changes the active site for subsequent Jira work. |
| Resolved in code; requires provider smoke test | Jira issues and Notion search/tasks stopped at a single page. | Added cursor-based Jira and Notion pagination with explicit load-more controls. |
| Release blocker | The app has not been exercised against real Jira/Notion OAuth apps, SMTP, or production hosting. | Configure test provider apps and staging secrets; run end-to-end authorization, refresh, disconnect, reminder, and deployment checks before launch. |
| Provider dependency | Public provider endpoints have their own history/rate limits and can change. Some imports are explicitly best-effort or capped. | Keep per-provider failures visible, monitor provider API changes, and communicate the existing history limits before claiming complete activity data. |
| Launch requirement | Early-access copy is a service summary, not reviewed legal policy; support, retention, privacy, and deletion terms depend on the actual operator and hosting setup. | Publish reviewed policies and a support contact that match the deployment before inviting users. |

## Relevant implementation files

- OAuth setup and provider calls: `server/src/routes/integrations.js`, `server/src/services/externalIntegrations.js`, `client/src/components/dashboard/WorkHub.jsx`
- Reminder job: `server/src/services/reminders.js`
- Setup status: `client/src/components/dashboard/StartupGuide.jsx`
- Responsive layout: `client/src/styles.css`
- Work hub result limits: `README.md`
