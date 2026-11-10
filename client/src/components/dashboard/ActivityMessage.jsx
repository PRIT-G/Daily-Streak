import { CircleAlert, LoaderCircle } from 'lucide-react';

export default function ActivityMessage({ error, loading, empty, emptyTitle, onRetry }) {
  if (loading) {
    return (
      <div className="provider-activity-state">
        <LoaderCircle className="spin" size={18} />
        <span>Loading activity…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="provider-activity-state error" role="alert">
        <CircleAlert size={18} />
        <span>{error}</span>
        {onRetry && <button className="small-button" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="provider-activity-state">
        <span>{emptyTitle}</span>
      </div>
    );
  }
  return null;
}

