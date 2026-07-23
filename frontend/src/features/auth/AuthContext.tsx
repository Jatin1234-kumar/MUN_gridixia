import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react';
import api, { setAccessToken } from '@/lib/api';
import type { AuthUser, AuthState, AuthAction, UserRole } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasMinimumRole: (role: UserRole) => boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  delegate: 1,
  staff: 2,
  organizer: 3,
  admin: 4,
  super_admin: 5,
};

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
      };
    case 'AUTH_FAILURE':
      return { ...state, isLoading: false, isAuthenticated: false, user: null, accessToken: null };
    case 'LOGOUT':
      return { ...state, isLoading: false, isAuthenticated: false, user: null, accessToken: null };
    case 'TOKEN_REFRESHED':
      return { ...state, accessToken: action.payload.accessToken };
    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
};

// Default Access Token Lifespan: 15 minutes (15 * 60 * 1000 ms)
const DEFAULT_TOKEN_LIFESPAN = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresInMs: number = DEFAULT_TOKEN_LIFESPAN) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    // Refresh 1 minute before token expiry, or at least in 30 seconds
    const refreshAt = Math.max(expiresInMs - 60_000, 30_000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
        dispatch({ type: 'TOKEN_REFRESHED', payload: { accessToken: data.accessToken } });
        setAccessToken(data.accessToken);
        scheduleRefresh(DEFAULT_TOKEN_LIFESPAN);
      } catch {
        dispatch({ type: 'AUTH_FAILURE' });
      }
    }, refreshAt);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/refresh');
        if (cancelled) return;
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, accessToken: data.accessToken } });
        setAccessToken(data.accessToken);
        scheduleRefresh(DEFAULT_TOKEN_LIFESPAN);
      } catch {
        if (!cancelled) dispatch({ type: 'AUTH_FAILURE' });
      }
    }

    hydrate();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', { email, password });
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, accessToken: data.accessToken } });
      setAccessToken(data.accessToken);
      scheduleRefresh(DEFAULT_TOKEN_LIFESPAN);
    } catch (err) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw err;
    }
  }, [scheduleRefresh]);

  const register = useCallback(async (regData: { firstName: string; lastName: string; email: string; password: string }) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/register', regData);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, accessToken: data.accessToken } });
      setAccessToken(data.accessToken);
      scheduleRefresh(DEFAULT_TOKEN_LIFESPAN);
    } catch (err: any) {
      dispatch({ type: 'AUTH_FAILURE' });
      
      if (err.response && err.response.status === 422) {
        console.error("❌ Backend Validation Error:", err.response.data);
      }
      
      throw err;
    }
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      setAccessToken(null);
      // Clear all user-scoped delegate/payment data so it never leaks to the next session
      Object.keys(localStorage)
        .filter((k) => k.startsWith('mun-gridixia:') || k.startsWith('mun_apply_draft_'))
        .forEach((k) => localStorage.removeItem(k));
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const hasRole = useCallback(
    (role: UserRole) => state.user?.role === role,
    [state.user?.role],
  );

  const hasMinimumRole = useCallback(
    (role: UserRole) => {
      if (!state.user) return false;
      return ROLE_HIERARCHY[state.user.role] >= ROLE_HIERARCHY[role];
    },
    [state.user],
  );

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        accessToken: state.accessToken,
        isLoading: state.isLoading,
        isAuthenticated: state.isAuthenticated,
        login,
        register,
        logout,
        hasRole,
        hasMinimumRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}