export type UserRole = 'super_admin' | 'admin' | 'organizer' | 'staff' | 'delegate' | 'guest';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AuthUser; accessToken: string } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; payload: { accessToken: string } };
