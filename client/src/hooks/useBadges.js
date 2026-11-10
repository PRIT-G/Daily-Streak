import { useCallback } from 'react';
import {
  deleteUploadedBadge,
  disableBadgeGallery,
  enableBadgeGallery,
  uploadEarnedBadge
} from '../features/dashboard/api.js';

export function useBadges({ token, runAction }) {
  const addUploadedBadge = useCallback((badge) =>
    runAction(() => uploadEarnedBadge(token, badge), 'Badge added to your milestones.'),
  [runAction, token]);

  const removeUploadedBadge = useCallback((badgeId) =>
    runAction(() => deleteUploadedBadge(token, badgeId), 'Uploaded badge removed.'),
  [runAction, token]);

  const setPublicBadgeGallery = useCallback((enabled) =>
    runAction(
      () => enabled ? enableBadgeGallery(token) : disableBadgeGallery(token),
      enabled ? 'Public badge gallery enabled.' : 'Public badge gallery disabled.'
    ), [runAction, token]);

  return {
    addUploadedBadge,
    removeUploadedBadge,
    setPublicBadgeGallery
  };
}

