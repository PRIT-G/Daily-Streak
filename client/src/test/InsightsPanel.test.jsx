import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightsPanel from '../components/dashboard/InsightsPanel.jsx';

const baseInsights = {
  windowDays: 30,
  consistencyScore: 80,
  activeDays: 24,
  goalDays: 20,
  averageDailyActivity: 3.2,
  bestDay: { date: '2026-11-01', total: 12 },
  busiestSource: [{ id: 'github', count: 40 }, { id: 'leetcode', count: 15 }],
  weekComparison: { thisWeek: 5, lastWeek: 4 },
  streak: { current: 6, atRisk: true, todayMet: false },
  nextMilestone: { threshold: 7, title: 'One Week Wonder', daysRemaining: 1 },
  prediction: {
    recentDailyAverage: 3.1,
    trend: 'steady',
    forecasts: [{ streakDays: 7, daysNeeded: 1, estimatedDate: '2026-11-09', estimatedDateLabel: 'Nov 9, 2026' }]
  },
  anomaly: { detected: true, direction: 'down', changePercent: -45, message: 'Activity dropped 45% versus the previous 30 days.' },
  goalSuggestion: { suggestedTarget: 3, currentTarget: 1, activeDays: 24, currentHitRate: 90, suggestedHitRate: 70, message: 'Consider raising your goal.' },
  recommendations: [{ id: 'r1', text: 'Keep going.' }],
  dataQuality: { connectedProviders: 2, staleProviders: [] }
};

const dashboard = { streaks: { current: 6, longest: 12 } };

describe('InsightsPanel', () => {
  it('renders nothing without insights', () => {
    const { container } = render(<InsightsPanel insights={null} dashboard={dashboard} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders consistency score, sources, forecast, anomaly and recommendations', () => {
    render(<InsightsPanel insights={baseInsights} dashboard={dashboard} />);
    expect(screen.getByText('Streak insights')).toBeInTheDocument();
    expect(screen.getByText('Consistency score')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText(/Activity dropped 45%/)).toBeInTheDocument();
    expect(screen.getByText(/7-day streak/)).toBeInTheDocument();
    expect(screen.getByText(/Goal suggestion/)).toBeInTheDocument();
    expect(screen.getByText(/One Week Wonder/)).toBeInTheDocument();
    expect(screen.getByText(/streak is at risk/)).toBeInTheDocument();
  });

  it('handles empty recommendations gracefully', () => {
    render(<InsightsPanel insights={{ ...baseInsights, recommendations: [], anomaly: { detected: false }, prediction: { forecasts: [] }, goalSuggestion: null }} dashboard={dashboard} />);
    expect(screen.getByText(/nothing to fix right now|great trajectory/i)).toBeInTheDocument();
    expect(screen.getByText(/Not enough history to forecast/)).toBeInTheDocument();
  });
});
