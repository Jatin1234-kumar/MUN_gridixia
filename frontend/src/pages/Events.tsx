import { useState } from 'react';
import { Plus, Calendar, MapPin, Users, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEvents, useCreateEvent } from '@/hooks/useEvents';
import { useAuth } from '@/features/auth/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventForm, type EventFormValues } from '@/features/events/EventForm';
import { formatDate } from '@/lib/utils';
import type { Event } from '@/types';

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:border-gold-500/30"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Badge variant={event.type === 'MUN' ? 'mun' : 'parliament'}>
              {event.type === 'MUN' ? 'MUN' : 'Youth Parliament'}
            </Badge>
            <Badge
              variant={
                event.status === 'active'
                  ? 'active'
                  : event.status === 'pending'
                    ? 'pending'
                    : 'inactive'
              }
            >
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
              <span className="font-mono">{formatDate(event.startAt)}</span>
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
          <div className="mt-4 flex items-center gap-1.5 text-xs text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink size={11} />
            <span>View details &amp; register</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EventDetailModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className="glass-card gold-border w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">{event.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{event.location}</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors ml-4 shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <Badge variant={event.type === 'MUN' ? 'mun' : 'parliament'}>
              {event.type === 'MUN' ? 'MUN' : 'Youth Parliament'}
            </Badge>
            <Badge
              variant={
                event.status === 'active'
                  ? 'active'
                  : event.status === 'pending'
                    ? 'pending'
                    : 'inactive'
              }
            >
              {event.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-5">{event.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Start</p>
              <p className="text-sm text-foreground mt-1">{formatDate(event.startAt)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">End</p>
              <p className="text-sm text-foreground mt-1">{formatDate(event.endAt)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Capacity</p>
              <p className="text-sm text-foreground mt-1">{event.capacity} delegates</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Registered</p>
              <p className="text-sm text-foreground mt-1">{event.delegateCount ?? 0} delegates</p>
            </div>
          </div>

          <Button
            className="w-full bg-gold-500 text-navy-950 hover:bg-gold-400"
            onClick={() => navigate(`/apply/${event.id}`)}
          >
            Register for this Event
          </Button>
        </div>
      </motion.div>
    </>
  );
}

export default function Events() {
  const { data: events = [], isLoading, error } = useEvents();
  const createEvent = useCreateEvent();
  const { hasMinimumRole } = useAuth();
  const [tab, setTab] = useState<'all' | 'MUN' | 'YOUTH_PARLIAMENT'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const canCreateEvent = hasMinimumRole('organizer');

  async function handleCreate(values: EventFormValues) {
    await createEvent.mutateAsync({
      ...values,
      startAt: new Date(values.startAt).toISOString(),
      endAt: new Date(values.endAt).toISOString(),
    });
    setShowCreateModal(false);
  }

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
          canCreateEvent ? (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} />
              New Event
            </Button>
          ) : undefined
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
              description={
                canCreateEvent
                  ? 'Create your first event to get started.'
                  : 'No events are available right now. Check back later.'
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Event detail / register modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>

      {/* Create event modal (organizer+) */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="glass-card gold-border w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-foreground">Create New Event</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <EventForm onSubmit={handleCreate} isLoading={createEvent.isPending} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
