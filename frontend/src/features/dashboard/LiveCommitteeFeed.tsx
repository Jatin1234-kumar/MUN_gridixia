import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BellRing,
  Clock3,
  Filter,
  Info,
  MapPinned,
  Megaphone,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn, formatDate } from '@/lib/utils';

const feedStorageKey = 'mun-gridixia:committee-feed-read:v1';

type FeedCategory = 'all' | 'agenda' | 'logistics' | 'schedule' | 'resources';
type FeedPriority = 'high' | 'normal' | 'low';

type CommitteeFeedItem = {
  id: string;
  title: string;
  message: string;
  committee: string;
  category: FeedCategory;
  priority: FeedPriority;
  createdAt: string;
  unread: boolean;
  live?: boolean;
};

const initialFeed: CommitteeFeedItem[] = [
  {
    id: 'feed-1',
    title: 'Agenda Updated',
    message: 'The UNSC agenda has been revised to emphasize crisis de-escalation and resolution drafting.',
    committee: 'UNSC',
    category: 'agenda',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    unread: true,
  },
  {
    id: 'feed-2',
    title: 'Room Changed',
    message: 'GA1 has moved to Room 402. Please follow the new seating plan at the venue entrance.',
    committee: 'GA1',
    category: 'logistics',
    priority: 'normal',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    unread: true,
  },
  {
    id: 'feed-3',
    title: 'Schedule Changed',
    message: 'Opening session begins 15 minutes later. Committee roll call remains unchanged.',
    committee: 'All Committees',
    category: 'schedule',
    priority: 'normal',
    createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    unread: false,
  },
  {
    id: 'feed-4',
    title: 'Background Guide Uploaded',
    message: 'The WHO background guide is now available for download in the resources panel.',
    committee: 'WHO',
    category: 'resources',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    unread: false,
  },
];

const liveQueue: Omit<CommitteeFeedItem, 'createdAt' | 'unread'>[] = [
  {
    id: 'live-1',
    title: 'Agenda Updated',
    message: 'Delegates should review the updated clause structure before moderated caucus begins.',
    committee: 'ECOSOC',
    category: 'agenda',
    priority: 'high',
    live: true,
  },
  {
    id: 'live-2',
    title: 'Room Changed',
    message: 'HRC now meets in the Lake Hall annex. Signage has been updated on site.',
    committee: 'HRC',
    category: 'logistics',
    priority: 'normal',
    live: true,
  },
  {
    id: 'live-3',
    title: 'Schedule Changed',
    message: 'A short recess has been added before voting procedure to accommodate committee admin.',
    committee: 'All Committees',
    category: 'schedule',
    priority: 'normal',
    live: true,
  },
  {
    id: 'live-4',
    title: 'Background Guide Uploaded',
    message: 'The GA2 guide is now live with topic notes, key questions, and research prompts.',
    committee: 'GA2',
    category: 'resources',
    priority: 'low',
    live: true,
  },
];

function readJson<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function categoryLabel(category: FeedCategory) {
  return {
    all: 'All',
    agenda: 'Agenda',
    logistics: 'Logistics',
    schedule: 'Schedule',
    resources: 'Resources',
  }[category];
}

function priorityBadge(priority: FeedPriority) {
  return {
    high: 'urgent' as const,
    normal: 'pending' as const,
    low: 'inactive' as const,
  }[priority];
}

function FeedIcon({ category }: { category: FeedCategory }) {
  const iconMap: Record<FeedCategory, ComponentType<{ className?: string }>> = {
    all: BellRing,
    agenda: Megaphone,
    logistics: MapPinned,
    schedule: Clock3,
    resources: Upload,
  };

  const Icon = iconMap[category];
  return <Icon className="h-4 w-4" />;
}

function FeedItemRow({ item, onMarkRead }: { item: CommitteeFeedItem; onMarkRead: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-2xl border p-4 transition-all duration-200',
        item.unread ? 'border-gold-500/20 bg-gold-500/10 shadow-[0_18px_42px_rgba(0,0,0,0.12)]' : 'border-white/[0.06] bg-white/[0.02]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', item.unread ? 'border-gold-500/25 bg-gold-500/15 text-gold-300' : 'border-white/[0.08] bg-navy-900/60 text-muted-foreground')}>
          <FeedIcon category={item.category} />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.unread && <Badge variant="urgent">Unread</Badge>}
            {item.live && <Badge variant="active">Live</Badge>}
          </div>

          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{item.committee}</p>
          <p className="text-sm text-foreground/90">{item.message}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant={priorityBadge(item.priority)}>{item.priority}</Badge>
              <span>{formatDate(item.createdAt)}</span>
            </div>
            <button type="button" onClick={() => onMarkRead(item.id)} className="text-gold-400 transition-colors hover:text-gold-300">
              Mark read
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveCommitteeFeed() {
  const [items, setItems] = useState<CommitteeFeedItem[]>(() => initialFeed);
  const [filter, setFilter] = useState<FeedCategory>('all');
  const [livePulse, setLivePulse] = useState(0);

  useEffect(() => {
    const storedReadIds = readJson<string[]>(feedStorageKey) ?? [];
    setItems((current) => current.map((item) => ({ ...item, unread: !storedReadIds.includes(item.id) })));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setItems((current) => {
        const next = liveQueue[livePulse % liveQueue.length];
        const duplicate = current.some((item) => item.id === next.id);
        if (duplicate) {
          setLivePulse((value) => value + 1);
          return current;
        }

        const incoming: CommitteeFeedItem = {
          ...next,
          createdAt: new Date().toISOString(),
          unread: true,
        };

        setLivePulse((value) => value + 1);
        return [incoming, ...current].slice(0, 8);
      });
    }, 25000);

    const storageListener = () => {
      const storedReadIds = readJson<string[]>(feedStorageKey) ?? [];
      setItems((current) => current.map((item) => ({ ...item, unread: !storedReadIds.includes(item.id) })));
    };

    window.addEventListener('storage', storageListener);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', storageListener);
    };
  }, [livePulse]);

  const unreadCount = items.filter((item) => item.unread).length;
  const filteredItems = useMemo(() => {
    return filter === 'all' ? items : items.filter((item) => item.category === filter);
  }, [filter, items]);

  const markRead = (id: string) => {
    const storedReadIds = new Set(readJson<string[]>(feedStorageKey) ?? []);
    storedReadIds.add(id);
    writeJson(feedStorageKey, Array.from(storedReadIds));
    setItems((current) => current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  };

  const markAllRead = () => {
    const nextIds = items.map((item) => item.id);
    writeJson(feedStorageKey, nextIds);
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
  };

  const filteredUnread = filteredItems.filter((item) => item.unread).length;

  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="space-y-4 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardDescription className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Live Committee Feed</CardDescription>
            <CardTitle className="mt-2 text-2xl text-foreground">Announcements</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Keep delegates informed with agenda updates, room changes, schedule changes, and background guide uploads.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold-300">Unread</p>
              <p className="text-lg font-semibold text-gold-200">{unreadCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as FeedCategory)} className="w-full">
            <div className="flex flex-wrap items-center gap-3">
              <TabsList className="flex h-auto flex-wrap justify-start rounded-2xl p-1.5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="logistics">Logistics</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={markAllRead} className="ml-auto">
                <RefreshCw size={14} />
                Mark all read
              </Button>
            </div>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FeedCategory)}>
          <TabsContent value={filter} className="mt-0">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <BellRing className="h-4 w-4 text-gold-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">{categoryLabel(filter)} Updates</p>
                  <p className="text-xs text-muted-foreground">{filteredUnread} unread in this filter</p>
                </div>
              </div>
              <Badge variant="default">Realtime</Badge>
            </div>

            <div className="space-y-3">
              {filteredItems.map((item) => (
                <FeedItemRow key={item.id} item={item} onMarkRead={markRead} />
              ))}
              {filteredItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/20 bg-gold-500/10 text-gold-400">
                    <Info className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">No announcements yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">New committee updates will appear here automatically as they arrive.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-5" />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Agenda" value={items.filter((item) => item.category === 'agenda').length.toString()} description="Agenda updates tracked" icon={Megaphone} />
          <SummaryCard title="Logistics" value={items.filter((item) => item.category === 'logistics').length.toString()} description="Room and venue notices" icon={MapPinned} />
          <SummaryCard title="Schedule" value={items.filter((item) => item.category === 'schedule').length.toString()} description="Timing adjustments" icon={Clock3} />
          <SummaryCard title="Resources" value={items.filter((item) => item.category === 'resources').length.toString()} description="Guides and attachments" icon={Upload} />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}