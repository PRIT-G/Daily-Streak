# Daily Streak Tracker

> **Turn scattered coding effort into one measurable daily habit.**

Daily Streak Tracker is a developer productivity platform that unifies coding activity from multiple platforms into a single streak, goals, and insights dashboard. It helps developers, students, and builders stay consistent, visualize progress, and turn practice into long-term momentum.

---

## The Problem

Developers work across GitHub, LeetCode, Codeforces, GitLab, and project tools—but progress is fragmented. Without a single view of daily effort:
- Consistency is hard to measure
- Streaks and habits are easy to break
- Learning and coding progress feel invisible
- Planning (study, tasks, work) lives separately from activity

## The Solution

Daily Streak Tracker aggregates public coding signals and private activity into one workspace:
- **One streak** across platforms, normalized by day
- **Actionable insights** (consistency, forecasts, anomalies, recommendations)
- **Goals & accountability** with streak freezes and reminders
- **Planning + work context** via student planner and Jira/Notion integrations
- **Shareable proof of progress** through badges, public profiles, and leaderboard

---

## Who It’s For

- **Students & learners** building a daily coding/study habit
- **Developers** preparing for interviews or maintaining consistency
- **Teams/individuals** who want lightweight visibility into work and contribution rhythms
- **Builders** who want a self-hostable, extensible activity tracker

---

## Key Features

| Area | Capabilities |
|------|---------------|
| **Multi-platform Tracking** | Sync activity from GitHub, LeetCode, Codeforces, and GitLab into a unified daily timeline |
| **Streaks & Goals** | Current/longest streaks, daily targets, streak freeze shields (earned over time) |
| **Insights** | 30-day consistency score, streak forecasts, anomaly detection, weekday patterns, recommendations |
| **Student Planner** | Private tasks for assignments, exams, and study sessions (create/edit/complete/filter/delete) |
| **Milestones & Badges** | Auto-earned streak badges plus custom badge uploads and optional public badge gallery |
| **Work Hub** | Jira & Notion OAuth integration for viewing/updating assigned work and task databases |
| **Public Presence** | Opt-in public profile streak cards and weekly consistency leaderboard |
| **Webhook Ingestion** | Record private activity from scripts/CI via signed per-user webhooks |
| **PWA** | Installable web app with offline-capable service worker |
| **Security** | JWT access + rotating refresh tokens, login lockout, audit logging, CSP, rate limiting |

---

## How It Works

1. **Connect sources** — Link public provider usernames and/or authorize integrations.
2. **Sync activity** — Provider adapters fetch and normalize daily counts; background sync jobs supported.
3. **Unify & compute** — Activity is merged by UTC day to calculate streaks, goals, and insights.
4. **Plan & act** — Use the planner, work hub, reminders, and insights to stay consistent.
5. **Show progress** — Earn badges, export data, or share an opt-in public profile/leaderboard entry.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, CSS |
| **Backend** | Node.js, Express |
| **Database** | MongoDB (Mongoose) |
| **Auth** | JWT (short-lived access + rotating refresh tokens) |
| **Testing** | Vitest, React Testing Library, Supertest (Node test runner) |
| **Quality** | ESLint (flat config), Prettier |
| **CI/CD** | GitHub Actions, Dependabot |
| **Integrations** | OAuth (GitHub/Jira/Notion), provider adapters, webhooks, PWA |

---

## Quick Start

### Prerequisites
- **Node.js 20+**
- **MongoDB** (local instance or MongoDB Atlas URI)
- **SMTP credentials** (required for production email flows)

### Installation

```bash
# 1. Clone and install
git clone https://github.com/PRIT-G/Daily-Streak.git
cd Daily-Streak
npm install

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env: set MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN

# 3. Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Start development (API + client)
npm run dev
```

- **App:** http://localhost:5173  
- **API health:** http://localhost:4000/api/health

### Environment Variables

**Required (`server/.env`)**
```env
MONGODB_URI=mongodb://localhost:27017/daily-streak
JWT_SECRET=your-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
```

**Production (additional)**
```env
SMTP_HOST=smtp.example.com
SMTP_USER=your-user
SMTP_PASS=your-password
API_PUBLIC_URL=https://api.yourdomain.com
INTEGRATION_TOKEN_ENCRYPTION_KEY=64-char-hex
INTEGRATION_ADMIN_SECRET=32+-char-random

# OAuth providers (as needed)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
```

> Never commit `.env` files or secrets. Use `server/.env.example` as a template.

---

## Project Structure

```text
Daily-Streak/
├── client/                 # React (Vite) frontend
│   ├── src/
│   │   ├── api/            # Shared API client/helpers
│   │   ├── components/     # UI components (dashboard, auth, heatmap, etc.)
│   │   ├── features/       # Feature API modules (auth, dashboard, providers, webhooks, etc.)
│   │   ├── hooks/          # Custom hooks (session/state/actions)
│   │   ├── lib/            # Utilities
│   │   ├── test/           # Component tests
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
├── server/                 # Express API
│   ├── src/
│   │   ├── routes/         # HTTP endpoints & validation
│   │   ├── services/       # Business logic & data workflows
│   │   ├── models/         # Mongoose schemas
│   │   ├── providers/      # External activity provider adapters
│   │   ├── middleware/     # Auth, logging, guards
│   │   ├── utils/          # Streaks, insights, badges, helpers
│   │   ├── app.js
│   │   └── index.js
│   ├── test/               # API & unit tests
│   └── .env.example
├── load/                   # k6 load scripts
├── .github/workflows/      # CI & PR review automation
├── eslint.config.js
├── .prettierrc.json
├── package.json
└── README.md
```

---

## Available Scripts

```bash
npm run dev          # Start client + server (concurrently)
npm run build        # Build client for production
npm run start        # Run production server
npm test             # Run all tests (server + client)
npm run lint         # ESLint
npm run format       # Prettier write
npm run format:check # Prettier check (CI)
npm audit            # Security audit (high severity)
```

## Development Tooling

Committed configs ensure consistent quality across contributors and CI:

- **`package.json` / `package-lock.json`** — Workspaces, scripts, and locked dependencies. Run `npm install` at the root.
- **`eslint.config.js`** — Flat ESLint config (React-aware). Run `npm run lint`.
- **`.prettierrc.json`** — Formatting rules. Run `npm run format` / `npm run format:check`.

Example Prettier config:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## API Highlights

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in (access + refresh tokens) |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `GET`  | `/api/dashboard` | Dashboard data |
| `GET`  | `/api/dashboard/insights` | Computed insights |
| `POST` | `/api/providers/:provider/refresh` | Sync provider activity |
| `POST` | `/api/webhooks/activity` | Ingest private activity (signed) |
| `GET`  | `/api/leaderboard` | Weekly consistency leaderboard |
| `GET`  | `/api/public/badges/:key` | Public badge gallery |

> Routes are also available under `/api/v1/*` for versioned access.

---

## Deployment

1. **Build**: `npm run build`
2. **Configure** production environment variables (MongoDB, JWT, SMTP, OAuth, API URLs)
3. **Run**: `npm run start` (serve API and built client as configured)
4. **Harden**: place behind a reverse proxy (e.g. Nginx) with TLS
5. **Verify**: health checks, auth flows, provider sync, and email delivery

---

## Roadmap (Vision)

- **Smarter insights**: deeper trend analysis, personalized goals, and habit nudges
- **More providers**: broader coding, learning, and productivity source integrations
- **Team & classroom modes**: shared challenges, cohorts, and progress views
- **Mobile-first experience**: richer PWA/offline flows and notifications
- **Extensibility**: plugin-friendly provider and insight architecture

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes and run checks: `npm run lint && npm test`
4. Commit: `git commit -m "Add your feature"`
5. Push and open a Pull Request

Please open an issue for major proposals or architectural changes.

---

## License

MIT — see [LICENSE](LICENSE) if present in the repository.

## Support

- **Issues:** [GitHub Issues](https://github.com/PRIT-G/Daily-Streak/issues)
- **Discussions:** [GitHub Discussions](https://github.com/PRIT-G/Daily-Streak/discussions)

---

*Built to make consistency visible—one day, one streak at a time.*
