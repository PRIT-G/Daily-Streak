// k6 load test for the dashboard endpoint (validates rate limiter under realistic traffic).
// Usage: k6 run -e BASE_URL=http://localhost:4000 -e TOKEN=<jwt> load/k6-dashboard.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    dashboard_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.TOKEN || '';

export default function () {
  const res = http.get(`${BASE_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has streaks': (r) => r.json('streaks') !== undefined,
  });
}
