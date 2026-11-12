import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import AuthScreen from './components/AuthScreen.jsx';
import DashboardPage from './components/dashboard/DashboardPage.jsx';
import MarketingPage from './components/MarketingPage.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import PublicProfilePage from './components/PublicProfilePage.jsx';
import LeaderboardPage from './components/LeaderboardPage.jsx';
import { deleteAccount, exportAccount, exportActivityCsv } from './features/account/api.js';
import { runRecoveryAction } from './features/auth/api.js';
import useDailyStreak from './hooks/useDailyStreak.js';

export default function App() {
  const app = useDailyStreak();
  const [publicRoute, setPublicRoute] = useState(() => window.location.hash.replace(/^#/, ''));

  useEffect(() => {
    const updateRoute = () => setPublicRoute(window.location.hash.replace(/^#/, ''));
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  async function authenticate(mode, form) {
    await app.authenticate(mode, form);
    window.location.hash = 'overview';
  }

  const backToHome = () => {
    window.location.hash = '';
  };

  const routePath = publicRoute.split('?')[0];
  const routeParams = new URLSearchParams(
    publicRoute.includes('?') ? publicRoute.slice(publicRoute.indexOf('?') + 1) : ''
  );

  if (routePath.startsWith('u/')) {
    return <PublicProfilePage userId={routePath.slice(2)} onBack={backToHome} />;
  }
  if (routePath === 'leaderboard') {
    return <LeaderboardPage onBack={backToHome} />;
  }

  if (!app.token) {
    if (
      ['login', 'signup', 'request-reset', 'reset-password', 'verify-email'].includes(routePath)
    ) {
      const modeMap = {
        login: 'login',
        signup: 'register',
        'request-reset': 'request-reset',
        'reset-password': 'reset-password',
        'verify-email': 'verify-email',
      };
      return (
        <AuthScreen
          key={routePath}
          initialMode={modeMap[routePath]}
          initialToken={routeParams.get('token') || ''}
          onAuth={authenticate}
          onRecoveryAction={runRecoveryAction}
          onBack={() => {
            window.location.hash = '';
          }}
          message={app.authNotice}
        />
      );
    }
    return (
      <MarketingPage
        onGetStarted={() => {
          window.location.hash = 'signup';
        }}
        onSignIn={() => {
          window.location.hash = 'login';
        }}
      />
    );
  }
  if (app.loading) {
    return (
      <div className="loading-screen">
        <span className="brand-mark">
          <Flame size={20} fill="currentColor" />
        </span>
        <span>Getting your streak ready…</span>
      </div>
    );
  }

  const openSettings = () => {
    app.setSettingsOpen(true);
    app.setNotice(null);
  };

  async function downloadAccountExport() {
    try {
      const file = await exportAccount(app.token);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-streak-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (error) {
      app.setNotice({ type: 'error', text: error.message });
      return false;
    }
  }

  async function downloadActivityCsv() {
    try {
      const file = await exportActivityCsv(app.token);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-streak-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (error) {
      app.setNotice({ type: 'error', text: error.message });
      return false;
    }
  }

  async function removeAccount(password) {
    try {
      await deleteAccount(app.token, password);
      app.signOut();
      return true;
    } catch (error) {
      app.setNotice({ type: 'error', text: error.message });
      return false;
    }
  }

  return (
    <>
      <DashboardPage
        user={app.user}
        token={app.token}
        dashboard={app.dashboard}
        selectedYear={app.selectedYear}
        onYearChange={app.changeYear}
        todayCount={app.todayCount}
        notice={app.notice}
        onDismissNotice={() => app.setNotice(null)}
        onOpenSettings={openSettings}
        onSaveTask={app.saveStudentTask}
        onUpdateTask={app.updateTask}
        onDeleteTask={app.removeTask}
        onUploadBadge={app.addUploadedBadge}
        onDeleteUploadedBadge={app.removeUploadedBadge}
        onSetPublicBadgeGallery={app.setPublicBadgeGallery}
        onExternalNotice={app.setNotice}
        onRefreshDashboard={app.refreshDashboard}
        onSignOut={app.signOut}
      />
      {app.settingsOpen && (
        <SettingsPanel
          user={app.user}
          dashboard={app.dashboard}
          token={app.token}
          onClose={() => app.setSettingsOpen(false)}
          onSaveGoal={app.saveGoal}
          onSaveReminders={app.saveReminders}
          onSaveStreakFreeze={app.saveStreakFreeze}
          onSavePublicProfile={app.savePublicProfile}
          onConnect={app.saveProvider}
          onRefresh={app.refreshProvider}
          busyProvider={app.busyProvider}
          notice={app.notice}
          onExportAccount={downloadAccountExport}
          onExportActivityCsv={downloadActivityCsv}
          onDeleteAccount={removeAccount}
        />
      )}
    </>
  );
}
