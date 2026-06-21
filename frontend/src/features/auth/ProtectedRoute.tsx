import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/features/auth/types';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020818]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-gold-500" />
          <p className="text-xs text-muted-foreground font-mono animate-pulse">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

interface RoleGuardProps {
  roles: UserRole[];
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { hasMinimumRole, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020818]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-gold-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const permitted = roles.some((role) => hasMinimumRole(role));

  if (!permitted) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
