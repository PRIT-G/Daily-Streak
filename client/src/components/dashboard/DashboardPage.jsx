import { useEffect, useState } from 'react';
import { GoalPanel } from './ActivityGoalPanels.jsx';
import { MilestonesPanel, RecentActivityPanel } from './ActivityLists.jsx';
import ConnectionBanner from './ConnectionBanner.jsx';
import DashboardFooter from './DashboardFooter.jsx';
import DashboardHeader from './DashboardHeader.jsx';
import InsightsPanel from './InsightsPanel.jsx';
import NoticeToast from './NoticeToast.jsx';
import OverviewHero from './OverviewHero.jsx';
import ProviderActivity from './ProviderActivity.jsx';
import ProgressStats from './ProgressStats.jsx';
import Sidebar from './Sidebar.jsx';
import StudentPlanner from './StudentPlanner.jsx';
import StartupGuide from './StartupGuide.jsx';
import WorkHub from './WorkHub.jsx';
import WelcomeSection from './WelcomeSection.jsx';
import { dashboardPageFromHash } from './navigation.js';

function countConnections(providers = {}) {
  return Object.values(providers).filter((provider) => provider.username).length;
}

export default function DashboardPage({
  user,
  token,
  dashboard,
  todayCount,
  notice,
  selectedYear,
  onYearChange,
  onDismissNotice,
  onOpenSettings,
  onSaveTask,
  onUpdateTask,
  onDeleteTask,
  onUploadBadge,
  onDeleteUploadedBadge,
  onSetPublicBadgeGallery,
  onExternalNotice,
  onRefreshDashboard,
  onSignOut
}) {
  const [activePage, setActivePage] = useState(() => dashboardPageFromHash(window.location.hash));
  const connectedCount = countConnections(dashboard.providers);
  const greetingName = user?.name?.split(' ')[0] || 'there';
  const todayGoalMet = todayCount >= dashboard.goal.dailyTarget;
  const year = selectedYear;

  useEffect(() => {
    const syncPage = () => {
      setActivePage(dashboardPageFromHash(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  const planner = (
    <StudentPlanner
      tasks={dashboard.tasks}
      onSaveTask={onSaveTask}
      onUpdateTask={onUpdateTask}
      onDeleteTask={onDeleteTask}
    />
  );

  return (
    <div className="app-shell">
      <Sidebar user={user} dashboard={dashboard} activePage={activePage} onOpenSettings={onOpenSettings} onSignOut={onSignOut} />
      <main className="main-content">
        <DashboardHeader activePage={activePage} connectedCount={connectedCount} onOpenSettings={onOpenSettings} />
        <div className="page-body">
          <NoticeToast notice={notice} onDismiss={onDismissNotice} />
          {activePage === 'overview' && (
            <>
              <OverviewHero
                name={greetingName}
                dashboard={dashboard}
                todayCount={todayCount}
                todayGoalMet={todayGoalMet}
                onOpenSettings={onOpenSettings}
              />
              <ProgressStats dashboard={dashboard} todayCount={todayCount} todayGoalMet={todayGoalMet} />
              {!connectedCount && <ConnectionBanner onOpenSettings={onOpenSettings} />}
              <section className="content-grid">
                <GoalPanel dashboard={dashboard} todayCount={todayCount} todayGoalMet={todayGoalMet} onOpenSettings={onOpenSettings} />
                <RecentActivityPanel dashboard={dashboard} onOpenSettings={onOpenSettings} limit={3} onViewAll />
              </section>
            </>
          )}
          {activePage === 'insights' && (
            <section className="page-section">
              <WelcomeSection name={greetingName} title="Your insights" description="Consistency, trends, and recommendations computed from your activity." />
              <InsightsPanel insights={dashboard.insights} dashboard={dashboard} />
            </section>
          )}
          {activePage === 'activity' && (
            <section className="page-section">
              <WelcomeSection name={greetingName} title="Your coding activity" description="Explore your combined activity and each connected platform." />
              <ProviderActivity
                dashboard={dashboard}
                year={year}
                onYearChange={onYearChange}
                token={token}
                onOpenSettings={onOpenSettings}
                onNotice={onExternalNotice}
                onRefreshDashboard={onRefreshDashboard}
              />
            </section>
          )}
          {activePage === 'planner' && (
            <section className="page-section">
              <WelcomeSection name={greetingName} title="Your study plan" description="Keep courses, deadlines, and study sessions organized." />
              {planner}
            </section>
          )}
          {activePage === 'milestones' && (
            <section className="page-section">
              <WelcomeSection name={greetingName} title="Your milestones" description="Celebrate the goals and streaks you’ve earned along the way." />
              <MilestonesPanel
                token={token}
                badges={dashboard.badges}
                uploadedBadges={dashboard.uploadedBadges}
                publicBadgeGalleryId={dashboard.publicBadgeGalleryId}
                onUploadBadge={onUploadBadge}
                onDeleteUploadedBadge={onDeleteUploadedBadge}
                onSetPublicBadgeGallery={onSetPublicBadgeGallery}
              />
            </section>
          )}
          {activePage === 'work' && (
            <WorkHub token={token} onNotice={onExternalNotice} />
          )}
          {activePage === 'setup' && <StartupGuide />}
          <DashboardFooter />
        </div>
      </main>
    </div>
  );
}
