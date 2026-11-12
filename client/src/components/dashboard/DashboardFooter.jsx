import { ShieldCheck } from 'lucide-react';

export default function DashboardFooter() {
  return (
    <footer className="app-footer">
      <span>
        <ShieldCheck size={14} /> Your progress stays yours.
      </span>
      <span>
        Public profile data only <i /> Built for steady progress
      </span>
    </footer>
  );
}
