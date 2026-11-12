import { useCallback, useState } from 'react';
import { connectProvider, refreshProviderActivity } from '../features/providers/api.js';
import { providerLabel } from '../features/providers/catalog.js';

export function useProviders({ token, runAction, loadDashboard }) {
  const [busyProvider, setBusyProvider] = useState('');

  const saveProvider = useCallback(
    async (provider, username) => {
      const label = providerLabel(provider);
      await runAction(
        async () => {
          await connectProvider(token, provider, username);
          if (!username) return;

          setBusyProvider(provider);
          try {
            await refreshProviderActivity(token, provider);
          } catch (error) {
            await loadDashboard();
            throw error;
          } finally {
            setBusyProvider('');
          }
        },
        username ? `${label} connected. Your activity is up to date.` : `${label} disconnected.`
      );
    },
    [loadDashboard, runAction, token]
  );

  const refreshProvider = useCallback(
    async (provider) => {
      setBusyProvider(provider);
      try {
        await runAction(() => refreshProviderActivity(token, provider), 'Activity refreshed.');
      } finally {
        setBusyProvider('');
      }
    },
    [runAction, token]
  );

  return {
    busyProvider,
    saveProvider,
    refreshProvider,
  };
}
