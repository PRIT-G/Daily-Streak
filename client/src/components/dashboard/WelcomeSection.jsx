import { CalendarDays } from 'lucide-react';

export default function WelcomeSection({ name, title, description }) {
  return (
    <section className="welcome-row">
      <div>
        <div className="eyebrow muted-eyebrow">
          <span className="eyebrow-dot" /> YOUR DAILY PRACTICE
        </div>
        <h1>
          {title || `Good morning, ${name}`}
          <span className="wave">✳</span>
        </h1>
        <p>
          {description || 'Consistency is built one day at a time. Here’s how you’re showing up.'}
        </p>
      </div>
      <div className="date-chip">
        <CalendarDays size={16} />{' '}
        {new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </div>
    </section>
  );
}
