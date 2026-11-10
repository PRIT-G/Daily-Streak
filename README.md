# Daily Streak Tracker

A MERN stack application for tracking daily coding activity, streaks, goals, and milestone badges across multiple platforms (GitHub, LeetCode, Codeforces, GitLab). Built for developers who want to visualize their coding consistency and productivity.

## Features

- **Multi-platform Activity Tracking**: Sync coding activity from GitHub, LeetCode, Codeforces, and GitLab
- **Streak Management**: Track current/longest streaks with freeze shields earned every 7 days
- **Goals & Insights**: Set daily targets, view 30-day consistency scores, streak forecasts, and anomaly detection
- **Student Planner**: Private task management for assignments, exams, and study sessions
- **Milestone Badges**: Auto-earned streak badges + custom badge upload gallery
- **Work Hub**: Jira & Notion OAuth integration for issue/task tracking
- **Public Profiles & Leaderboard**: Opt-in public streak cards and weekly consistency leaderboard
- **Webhook Ingestion**: Record private activity from scripts/CI via signed webhooks
- **PWA Support**: Installable with offline-capable service worker
- **Security Hardened**: JWT rotation, login lockout, audit logging, CSP, rate limiting

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, CSS Modules |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Auth | JWT (access + rotating refresh tokens) |
| Testing | Vitest, React Testing Library, Supertest |
| Linting | ESLint (flat config), Prettier |
| CI/CD | GitHub Actions, Dependabot |

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas URI)
- SMTP credentials (production only)

### Installation

```bash
# Clone and install
git clone https://github.com/PRIT-G/Daily-Streak.git
cd Daily-Streak
npm install

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MONGODB_URI and JWT_SECRET

# Generate JWT_SECRET (run in terminal)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Start development servers (API + Frontend)
npm run dev
```

Open http://localhost:5173 — API health at http://localhost:4000/api/health

### Environment Variables

Required in `server/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/daily-streak
JWT_SECRET=your-64-char-hex-string
CLIENT_ORIGIN=http://localhost:5173
```

Production additionally requires:
```env
SMTP_HOST=smtp.example.com
SMTP_USER=your-user
SMTP_PASS=your-password
API_PUBLIC_URL=https://api.yourdomain.com
INTEGRATION_TOKEN_ENCRYPTION_KEY=64-char-hex
INTEGRATION_ADMIN_SECRET=32+-char-random
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
JIRA_CLIENT_ID=xxx
JIRA_CLIENT_SECRET=xxx
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx
```

## Project Structure

```
Daily-Streak/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (dashboard/, AuthScreen, Heatmap, etc.)
│   │   ├── features/       # Feature modules (auth, dashboard, providers, etc.)
│   │   ├── hooks/          # Custom React hooks (useDailyStreak, useAuth, etc.)
│   │   ├── lib/            # Utilities (errorTracking)
│   │   ├── test/           # Component tests
│   │   ├── App.jsx         # App composition
│   │   ├── main.jsx        # Entry point
│   │   └── styles.css      # Global styles
│   └── vite.config.js
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # HTTP endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Mongoose schemas
│   │   ├── providers/      # Activity provider adapters
│   │   ├── middleware/     # Auth, logging, validation
│   │   ├── utils/          # Helpers (streaks, badges, insights)
│   │   ├── app.js          # Express setup
│   │   └── index.js        # Entry point
│   ├── test/               # API & unit tests
│   └── .env.example
├── load/                   # k6 load testing scripts
├── .github/workflows/      # CI/CD
├── eslint.config.js
├── package.json
└── README.md
```

## Available Scripts

```bash
npm run dev          # Start both client & server (concurrently)
npm run build        # Build client for production
npm run start        # Run production server
npm test             # Run all tests (backend + frontend)
npm run lint         # ESLint check
npm run format       # Prettier format
npm run format:check # Prettier check (CI)
npm audit            # Security audit (high severity gates CI)
```

## Development Tooling Setup

These config files are committed to keep the project consistent. If you need to recreate or adjust them:

### `package.json` & `package-lock.json`
- **`package.json`**: Defines workspaces (`server`, `client`), scripts, and dependencies.
- **`package-lock.json`**: Locks exact dependency versions for reproducible installs. Commit it; do not add to `.gitignore`.
- **Setup**: Run `npm install` from the project root to install all workspace dependencies.

### ESLint (`eslint.config.js`)
- Uses ESLint flat config with React support and Prettier compatibility.
- **Run**: `npm run lint`
- **Minimal setup** (if recreating): install dev deps and create `eslint.config.js`:
```bash
npm install -D eslint @eslint/js eslint-plugin-react globals eslint-config-prettier
```
```js
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
  js.configs.recommended,
  { files: ['**/*.{js,jsx}'], languageOptions: { globals: { ...globals.browser, ...globals.node } }, plugins: { react }, rules: { /* project rules */ } }
];
```

### Prettier (`.prettierrc.json`)
- Defines formatting rules (semicolons, single quotes, trailing commas, print width).
- **Run**: `npm run format` (write) or `npm run format:check` (CI)
- **Example `.prettierrc.json`**:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```
- **Setup**: `npm install -D prettier eslint-config-prettier` and ensure ESLint config includes Prettier to avoid rule conflicts.

## API Endpoints (Selected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/auth/refresh` | Rotate refresh token |
| GET | `/api/dashboard` | Full dashboard data |
| GET | `/api/dashboard/insights` | Computed insights (30-day) |
| POST | `/api/providers/:provider/refresh` | Sync provider activity |
| POST | `/api/webhooks/activity` | Ingest private activity |
| GET | `/api/public/badges/:key` | Public badge gallery |
| GET | `/api/leaderboard` | Weekly consistency leaderboard |

## Deployment

1. Build client: `npm run build`
2. Set production environment variables
3. Run `npm run start` (serves static client + API)
4. Configure reverse proxy (nginx) + TLS
5. Ensure MongoDB Atlas + SMTP are configured

## Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Support

- Issues: [GitHub Issues](https://github.com/PRIT-G/Daily-Streak/issues)
- Discussions: [GitHub Discussions](https://github.com/PRIT-G/Daily-Streak/discussions)