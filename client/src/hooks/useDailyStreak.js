import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../features/auth/api.js';
import {
  getDashboard,
  getBadgeGallery,
  getStudentTasks,
  updateGoal,
  updateReminders,
  updateStreakFreeze,
  updatePublicProfile
} from '../features/dashboard/api.js';
import { useAuth, isMissingAccountError } from './useAuth.js';
import { useProviders } from './useProviders.js';
import { useTasks } from './useTasks.js';
import { useBadges } from './useBadges.js';

export const EMPTY_DASHBOARD = {
  activity: [],
  recent: [],
  tasks: [],
  streaks: { current: 0, longest: 0 },
  goal: { dailyTarget: 1 },
  weekProgress: { completed: 0, target: 7 },
  badges: [],
  uploadedBadges: [],
  publicBadgeGalleryId: '',
  providers: {
    github: { username: '', status: 'not-connected', message: '' },
    leetcode: { username: '', status: 'not-connected', message: '' },
    codeforces: { username: '', status: 'not-connected', message: '' },
    gitlab: { username: '', status: 'not-connected', message: '' }
  },
  insights: null,
  streakFreeze: { enabled: false, shields: 0, coveredDates: [] },
  publicProfile: { enabled: false, id: '' },
  reminders: { enabled: false, reminderTime: '20:00', weeklyDigest: false }
};

export default function useDailyStreak() {
  const {
    token,
    user,
    setUser,
    loading,
    setLoading,
    authNotice,
    authNoticeType,
    expireSession: authExpireSession,
    signOut: authSignOut,
    authenticate
  } = useAuth();

  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getUTCFullYear());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadDashboard = useCallback(async (activeToken = token, year = selectedYear) => {
    if (!activeToken) return;
    const [currentUser, data, taskData, gallery] = await Promise.all([
      getCurrentUser(activeToken),
      getDashboard(activeToken, year),
      getStudentTasks(activeToken),
      getBadgeGallery(activeToken)
    ]);
    setUser(currentUser.user);
    setDashboard({
      ...data,
      tasks: taskData.tasks,
      publicBadgeGalleryId: gallery.galleryId
    });
  }, [selectedYear, setUser, token]);

  const expireSession = useCallback((message) => {
    authExpireSession(message);
    setDashboard(EMPTY_DASHBOARD);
  }, [authExpireSession]);

  const signOut = useCallback(() => {
    authSignOut();
    setDashboard(EMPTY_DASHBOARD);
    setSettingsOpen(false);
  }, [authSignOut]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    getCurrentUser(token)
      .then((currentUser) => {
        if (!active) return null;
        setUser(currentUser.user);
        return Promise.all([
          getDashboard(token, selectedYear),
          getStudentTasks(token),
          getBadgeGallery(token)
        ]);
      })
      .then(([data, taskData, gallery]) => {
        if (active && data) setDashboard({
          ...data,
          tasks: taskData.tasks,
          publicBadgeGalleryId: gallery.galleryId
        });
      })
      .catch((error) => {
        if (!active) return;
        if (isMissingAccountError(error)) expireSession();
        else setNotice({ type: 'error', text: error.message });
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [token, selectedYear, expireSession, setLoading, setUser]);

  const changeYear = useCallback((year) => {
    setSelectedYear(year);
  }, []);

  const refreshDashboard = useCallback(() => loadDashboard(), [loadDashboard]);

  const runAction = useCallback(async (action, successMessage) => {
    try {
      await action();
      await loadDashboard();
      setNotice({ type: 'success', text: successMessage });
      window.setTimeout(() => setNotice(null), 4200);
      return true;
    } catch (error) {
      if (isMissingAccountError(error)) expireSession();
      setNotice({ type: 'error', text: error.message });
      return false;
    }
  }, [expireSession, loadDashboard]);

  const { busyProvider, saveProvider, refreshProvider } = useProviders({
    token,
    runAction,
    loadDashboard
  });

  const { saveStudentTask, updateTask, removeTask } = useTasks({
    token,
    runAction
  });

  const { addUploadedBadge, removeUploadedBadge, setPublicBadgeGallery } = useBadges({
    token,
    runAction
  });

  const saveGoal = useCallback((dailyTarget) =>
    runAction(() => updateGoal(token, dailyTarget), 'Daily goal updated.'), [runAction, token]);

  const saveReminders = useCallback((enabled, reminderTime, weeklyDigest) =>
    runAction(
      () => updateReminders(token, enabled, reminderTime, weeklyDigest),
      enabled ? 'Email reminders enabled.' : 'Email reminders turned off.'
    ), [runAction, token]);

  const saveStreakFreeze = useCallback((enabled) =>
    runAction(
      () => updateStreakFreeze(token, enabled),
      enabled ? 'Streak freeze enabled.' : 'Streak freeze disabled.'
    ), [runAction, token]);

  const savePublicProfile = useCallback((enabled) =>
    runAction(
      () => updatePublicProfile(token, enabled),
      enabled ? 'Public streak card enabled.' : 'Public streak card disabled.'
    ), [runAction, token]);

  const todayCount = useMemo(() => {
    if (Number.isFinite(dashboard.todayActivity)) return dashboard.todayActivity;
    const today = dashboard.today || new Date().toISOString().slice(0, 10);
    return dashboard.activity
      .filter((day) => day.date === today)
      .reduce((sum, day) => sum + day.total, 0);
  }, [dashboard]);

  return {
    token,
    user,
    dashboard,
    selectedYear,
    changeYear,
    loading,
    authNotice,
    authNoticeType,
    settingsOpen,
    setSettingsOpen,
    notice,
    setNotice,
    busyProvider,
    todayCount,
    refreshDashboard,
    authenticate,
    saveProvider,
    refreshProvider,
    saveGoal,
    saveReminders,
    saveStreakFreeze,
    savePublicProfile,
    saveStudentTask,
    updateTask,
    removeTask,
    addUploadedBadge,
    removeUploadedBadge,
    setPublicBadgeGallery,
    signOut
  };
}
