import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Users,
  Building2,
  FileText,
  Settings,
  Globe2,
  MapPinned,
  ScanLine,
  Award,
  ChevronRight,
  Shield,
  LogOut,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  minRole?: 'organizer' | 'admin' | 'super_admin';
  maxRole?: 'guest' | 'delegate' | 'staff' | 'organizer' | 'admin';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Command Center', to: '/command-center', icon: Shield, minRole: 'organizer' },
  { label: 'Events', to: '/events', icon: Calendar },
  { label: 'Committees', to: '/committees', icon: Building2 },
  { label: 'Delegates', to: '/delegates', icon: Users, maxRole: 'staff' },
  { label: 'Country Allocation', to: '/country-allocation', icon: MapPinned, minRole: 'organizer' },
  { label: 'Check-In Scanner', to: '/check-in', icon: ScanLine },
  { label: 'Certificate Vault', to: '/certificate-vault', icon: Award },
  { label: 'Payments', to: '/payments', icon: CreditCard },
  { label: 'Reports', to: '/reports', icon: FileText, minRole: 'organizer' },
  { label: 'Settings', to: '/settings', icon: Settings, minRole: 'organizer' },
  { label: 'Monitoring', to: '/monitoring', icon: Activity, minRole: 'admin' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, hasRole, hasMinimumRole, logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const visibleItems = navItems.filter((item) => {
    if (item.minRole && !hasMinimumRole(item.minRole)) return false;
    if (item.maxRole && hasMinimumRole(item.maxRole) && !hasRole(item.maxRole)) return false;
    return true;
  });

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'flex h-screen w-60 flex-col border-r border-white/[0.05] bg-navy-950/95 backdrop-blur-xl',
          'max-md:fixed max-md:z-50 max-md:transition-transform max-md:duration-200',
          isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.05]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/15 border border-gold-500/30">
            <Globe2 size={16} className="text-gold-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">MUN Gridixia</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">COMMAND CENTER</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="px-3 py-2 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            Navigation
          </p>
          {visibleItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="text-gold-500/50" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.05] space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="h-7 w-7 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-gold-400">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-red-400 hover:bg-white/[0.03]"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>
      <ConfirmDialog
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out? You will need to log in again to access the dashboard."
        confirmLabel="Sign Out"
        onConfirm={() => logout()}
      />
    </>
  );
}
