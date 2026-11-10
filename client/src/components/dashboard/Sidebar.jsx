import { Flame, LogOut, MoreHorizontal, Settings2 } from 'lucide-react';
import { DASHBOARD_PAGES } from './navigation.js';

export default function Sidebar({ user, dashboard, activePage, onOpenSettings, onSignOut }) {
  const greetingName = user?.name?.split(' ')[0] || 'there';

  return (
    <aside className="sidebar">
      <a className="brand" href="#" aria-label="Daily Streak home">
        <span className="brand-mark"><Flame size={19} fill="currentColor" /></span> daily<span>streak</span>
      </a>
      <div className="workspace-label">YOUR SPACE <MoreHorizontal size={16} /></div>
      <nav className="side-nav" aria-label="Main navigation">
        {DASHBOARD_PAGES.map(({ id, label, icon: Icon }) => (
          <a className={`nav-item ${activePage === id ? 'active' : ''}`} href={`#${id}`} key={id} aria-current={activePage === id ? 'page' : undefined}>
            <Icon size={17} /> {label}{id === 'milestones' && <span className="nav-count">{dashboard.badges.length}</span>}
          </a>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-streak-card">
        <div className="mini-flame"><Flame size={16} fill="currentColor" /></div>
        <div><small>YOUR CURRENT STREAK</small><strong>{dashboard.streaks.current} <span>days</span></strong></div>
        <div className="tiny-sparkline" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      </div>
      <button className="nav-item settings-link" onClick={onOpenSettings}><Settings2 size={17} /> Settings</button>
      <div className="profile-card">
        <div className="avatar">{greetingName[0]?.toUpperCase()}</div>
        <div className="profile-info"><strong>{user?.name}</strong><small>{user?.email}</small></div>
        <button className="icon-button profile-menu" aria-label="Sign out" title="Sign out" onClick={onSignOut}><LogOut size={16} /></button>
      </div>
    </aside>
  );
}
