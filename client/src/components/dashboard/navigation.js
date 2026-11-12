import {
  BookOpenCheck,
  BrainCircuit,
  Briefcase,
  CalendarDays,
  CircleHelp,
  LayoutDashboard,
  Trophy,
} from 'lucide-react';

export const DASHBOARD_PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'insights', label: 'Insights', icon: BrainCircuit },
  { id: 'activity', label: 'Activity', icon: CalendarDays },
  { id: 'planner', label: 'Study planner', icon: BookOpenCheck },
  { id: 'milestones', label: 'Milestones', icon: Trophy },
  { id: 'work', label: 'Work hub', icon: Briefcase },
  { id: 'setup', label: 'Setup & startup', icon: CircleHelp },
];

export function dashboardPageFromHash(hash) {
  const page = hash.replace(/^#/, '').split('?')[0];
  return DASHBOARD_PAGES.some((item) => item.id === page) ? page : 'overview';
}
