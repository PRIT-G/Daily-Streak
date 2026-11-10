import { Check, CircleHelp } from 'lucide-react';

export default function NoticeToast({ notice, onDismiss }) {
  if (!notice) return null;

  return (
    <div className={notice.type === 'error' ? 'toast toast-error' : 'toast toast-success'} role="status">
      <span>{notice.type === 'error' ? <CircleHelp size={17} /> : <Check size={17} />}</span>
      {notice.text}
      <button className="toast-close" aria-label="Dismiss message" onClick={onDismiss}>×</button>
    </div>
  );
}
