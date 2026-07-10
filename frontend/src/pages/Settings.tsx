import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Save,
  Check,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/AuthContext';
import api, { getApiErrorMessage } from '@/lib/api';

interface ToggleItem {
  label: string;
  description: string;
  enabled: boolean;
}

function Toggle({ item, onToggle }: { item: ToggleItem; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={item.enabled}
        aria-label={`${item.label}: ${item.enabled ? 'enabled' : 'disabled'}`}
        onClick={onToggle}
        className={`h-5 w-9 rounded-full transition-colors ${item.enabled ? 'bg-gold-500' : 'bg-navy-700'} relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:ring-offset-2 focus:ring-offset-navy-950`}
      >
        <span className="sr-only">
          {item.enabled ? 'Disable' : 'Enable'} {item.label}
        </span>
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${item.enabled ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

function RoleUpgradeCard() {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (user?.role !== 'organizer') return null;

  async function handleSubmit() {
    setStatus('loading');
    setMessage('');
    try {
      await api.post('/auth/role-requests', { requestedRole: 'admin', reason });
      setStatus('success');
      setMessage('Your request has been submitted and is pending super admin review.');
      setReason('');
    } catch (err) {
      setStatus('error');
      setMessage(getApiErrorMessage(err));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="lg:col-span-2"
    >
      <Card className="glass-card overflow-hidden border-white/[0.08]">
        <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Request Admin Role</CardTitle>
              <CardDescription>
                Submit a request to be upgraded to admin — reviewed by super admin
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="reason"
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
            >
              Reason (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Briefly explain why you need admin access..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={status === 'loading' || status === 'success'}
            />
          </div>
          {message && (
            <p className={`text-xs ${status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={status === 'loading' || status === 'success'}
          >
            {status === 'loading' ? (
              'Submitting...'
            ) : status === 'success' ? (
              <>
                <Check size={13} /> Request Sent
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [orgName, setOrgName] = useState('MUN Gridixia');
  const [contactEmail, setContactEmail] = useState('admin@mungridixia.org');
  const [toggles, setToggles] = useState<ToggleItem[]>([
    { label: 'Payment confirmations', description: 'Email on successful payments', enabled: true },
    { label: 'Registration updates', description: 'Notify when delegates register', enabled: true },
    {
      label: 'Committee allocations',
      description: 'Notify on committee assignments',
      enabled: false,
    },
  ]);

  function handleToggle(index: number) {
    setToggles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)),
    );
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and preferences"
        actions={
          <Button size="sm" onClick={handleSave}>
            {saved ? <Check size={13} /> : <Save size={13} />}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card overflow-hidden border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Organization</CardTitle>
                  <CardDescription>Basic organization details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label
                  htmlFor="org-name"
                  className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                >
                  Organization Name
                </Label>
                <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="contact-email"
                  className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                >
                  Contact Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="glass-card overflow-hidden border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Notifications</CardTitle>
                  <CardDescription>Email and push notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {toggles.map((item, index) => (
                  <Toggle key={item.label} item={item} onToggle={() => handleToggle(index)} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card overflow-hidden border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Security</CardTitle>
                  <CardDescription>Account security and access control</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Session Management</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    View and revoke active sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card overflow-hidden border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">System</CardTitle>
                  <CardDescription>Platform and integration settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Payment Gateway</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Razorpay integration status: <span className="text-emerald-400">Connected</span>
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Email Service</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Resend integration status: <span className="text-emerald-400">Connected</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <RoleUpgradeCard />
      </div>
    </div>
  );
}
