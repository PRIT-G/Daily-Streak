import { CircleHelp, Settings2 } from 'lucide-react';
import { DASHBOARD_PAGES } from './navigation.js';

export default function DashboardHeader({ activePage, connectedCount, onOpenSettings }) {
  const currentPage = DASHBOARD_PAGES.find((page) => page.id === activePage) || DASHBOARD_PAGES[0];
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>My space</span>
        <span className="crumb-slash">/</span>
        <strong>{currentPage.label}</strong>
      </div>
      <div className="top-actions">
        <span className="sync-status">
          <i />{' '}
          {connectedCount
            ? `${connectedCount} connection${connectedCount > 1 ? 's' : ''} linked`
            : 'No connections yet'}
        </span>
        <button
          className="icon-button help-button"
          aria-label="How tracking works"
          title="Activity is combined from connected public coding profiles"
        >
          <CircleHelp size={18} />
        </button>
        <button className="button button-outline top-settings" onClick={onOpenSettings}>
          <Settings2 size={16} /> Settings
        </button>
      </div>
      <nav className="mobile-nav" aria-label="Main navigation">
        {DASHBOARD_PAGES.map(({ id, label, icon: Icon }) => (
          <a
            className={activePage === id ? 'mobile-nav-item active' : 'mobile-nav-item'}
            href={`#${id}`}
            key={id}
            aria-current={activePage === id ? 'page' : undefined}
          >
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}
