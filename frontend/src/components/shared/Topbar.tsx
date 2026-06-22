import { Bell, LogOut, Menu, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const [time, setTime] = useState(new Date());
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.05] bg-navy-950/80 backdrop-blur-xl px-6 max-md:px-4">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={onMenuToggle}
            aria-label="Toggle navigation menu"
          >
            <Menu size={16} />
          </Button>
        )}
        <div className="relative w-64 max-md:hidden">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search events, delegates…"
            className="pl-8 h-8 text-xs"
            aria-label="Search events and delegates"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-mono text-gold-400 tabular-nums">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell size={15} />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold-500"
            aria-hidden="true"
          />
        </Button>
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500/20 border border-gold-500/30">
              <User size={12} className="text-gold-400" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-foreground leading-none">{user.email}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{user.role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-7 w-7 text-muted-foreground hover:text-red-400"
              aria-label="Sign out"
            >
              <LogOut size={13} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
