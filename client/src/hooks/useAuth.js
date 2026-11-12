import { useCallback, useEffect, useState } from 'react';
import { authenticate as authenticateRequest, logoutRequest } from '../features/auth/api.js';
import { TOKEN_KEY, clearSession, onSessionUpdated, storeSession } from '../api/index.js';

export { TOKEN_KEY };

export function clearStoredSession() {
  clearSession();
}

export function isMissingAccountError(error) {
  return (
    error.status === 401 ||
    (error.status === 404 && /account (?:no longer exists|not found)/i.test(error.message))
  );
}

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [authNotice, setAuthNotice] = useState('');
  const [authNoticeType, setAuthNoticeType] = useState('error');

  const expireSession = useCallback(
    (message = 'Your saved session is no longer linked to an account. Please sign in again.') => {
      clearStoredSession();
      setToken('');
      setUser(null);
      setAuthNotice(message);
      setAuthNoticeType('error');
    },
    []
  );

  useEffect(
    () =>
      onSessionUpdated((newToken, refreshedUser) => {
        setToken(newToken);
        if (refreshedUser) setUser(refreshedUser);
      }),
    []
  );

  const signOut = useCallback(async () => {
    const refreshToken = localStorage.getItem('daily-streak-refresh');
    try {
      await logoutRequest(token, refreshToken);
    } catch {
      // best-effort revocation; local session is cleared regardless
    }
    clearStoredSession();
    setToken('');
    setUser(null);
    setAuthNotice('');
  }, [token]);

  const authenticate = useCallback(async (mode, form) => {
    const result = await authenticateRequest(mode, form);
    if (result.verificationRequired) {
      setAuthNotice('Check your inbox for a verification link before signing in.');
      setAuthNoticeType('success');
      return result;
    }
    storeSession(result.token, result.refreshToken);
    setLoading(true);
    setAuthNotice('');
    setAuthNoticeType('error');
    setToken(result.token);
    setUser(result.user);
    return result;
  }, []);

  return {
    token,
    setToken,
    user,
    setUser,
    loading,
    setLoading,
    authNotice,
    setAuthNotice,
    authNoticeType,
    setAuthNoticeType,
    expireSession,
    signOut,
    authenticate,
  };
}
