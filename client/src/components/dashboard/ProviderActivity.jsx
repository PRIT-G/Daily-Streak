import { useEffect, useState } from 'react';
import { ActivityPanel } from './ActivityGoalPanels.jsx';
import GitHubActivity from './GitHubActivity.jsx';
import LeetCodeActivity from './LeetCodeActivity.jsx';
import PrivateActivity from './PrivateActivity.jsx';

function ActivityTabs({ activeTab, onChange }) {
  const tabs = [
    ['calendar', 'Activity calendar'],
    ['github', 'GitHub activity'],
    ['leetcode', 'LeetCode activity'],
    ['private', 'Private activity'],
  ];
  return (
    <div className="provider-activity-tabs" role="tablist" aria-label="Activity sources">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          className={activeTab === id ? 'provider-activity-tab active' : 'provider-activity-tab'}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ProviderActivity({
  dashboard,
  year,
  onYearChange,
  token,
  onOpenSettings,
  onNotice,
  onRefreshDashboard,
}) {
  const [activeTab, setActiveTab] = useState('calendar');
  const username = dashboard.providers?.leetcode?.username || '';

  useEffect(() => {
    const callback = new URLSearchParams(window.location.hash.split('?')[1] || '').get('github');
    if (!callback) return;
    onNotice({
      type: callback === 'connected' ? 'success' : 'error',
      text:
        callback === 'connected'
          ? 'GitHub connected. Recent repository activity is ready.'
          : 'GitHub connection could not be completed. Check the app configuration and try again.',
    });
    window.history.replaceState(null, '', '#activity');
  }, [onNotice]);

  return (
    <div className="provider-activity">
      <ActivityTabs activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'calendar' && (
        <ActivityPanel dashboard={dashboard} year={year} onYearChange={onYearChange} />
      )}
      {activeTab === 'github' && <GitHubActivity key={token} token={token} />}
      {activeTab === 'leetcode' && (
        <LeetCodeActivity
          key={token}
          token={token}
          username={username}
          onOpenSettings={onOpenSettings}
        />
      )}
      {activeTab === 'private' && (
        <PrivateActivity
          key={token}
          token={token}
          onNotice={onNotice}
          onRefreshDashboard={onRefreshDashboard}
        />
      )}
    </div>
  );
}
