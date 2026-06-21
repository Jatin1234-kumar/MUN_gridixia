import { useState } from 'react';
import { Plus, Calendar, MapPin, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEvents } from '@/hooks/useEvents';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import type { Event } from '@/types';

function EventCard({ event }: { event: Event }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group cursor-pointer transition-all duration-300 hover:shadow-card-hover">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Badge variant={event.type === 'MUN' ? 'mun' : 'parliament'}>
              {event.type === 'MUN' ? 'MUN' : 'Youth Parliament'}
            </Badge>
            <Badge variant={event.status === 'active' ? 'active' : event.status === 'pending' ? 'pending' : 'inactive'}>
              {event.status}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-1 group-hover:text-gold-400 transition-colors">
            {event.name}
          </h3>
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar size={12} className="text-gold-500/60" />
              <span className="font-mono">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin size={12} className="text-gold-500/60" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users size={12} className="text-gold-500/60" />
              <span>{event.delegateCount ?? 0} delegates registered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Events() {
  const { data: events = [], isLoading, error } = useEvents();
  const [tab, setTab] = useState<'all' | 'MUN' | 'YOUTH_PARLIAMENT'>('all');

  if (isLoading) return <PageLoader />;
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Events" subtitle="Manage MUN and Youth Parliament events" />
        <EmptyState
          icon={Calendar}
          title="Failed to load events"
          description="Something went wrong while fetching events. Please try again."
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  const filtered = tab === 'all' ? events : events.filter((e) => e.type === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Manage MUN and Youth Parliament events"
        actions={
          <Button size="sm">
            <Plus size={14} />
            New Event
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="MUN">MUN</TabsTrigger>
          <TabsTrigger value="YOUTH_PARLIAMENT">Youth Parliament</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No events found"
              description="Create your first event to get started."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
