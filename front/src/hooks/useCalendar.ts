import { useState, useCallback } from 'react';
import { calendarAPI, authAPI } from '../api';
import {
  CalendarEvent,
  CalendarStats,
  CalendarEventType,
  EventPriority,
  User,
} from '../types';

export interface CalendarEventQuery {
  startDate: string;
  endDate: string;
  type?: string;
  priority?: string;
  status?: string;
  assignedToId?: string;
  myEventsOnly?: boolean;
}

export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  [CalendarEventType.INSPECTION]: '#1d4ed8',
  [CalendarEventType.REUNION]: '#7c3aed',
  [CalendarEventType.AUDIT]: '#0d9488',
  [CalendarEventType.FORMATION]: '#d97706',
  [CalendarEventType.MAINTENANCE]: '#6b7280',
  [CalendarEventType.AUTRE]: '#374151',
};

export const EVENT_PRIORITY_COLORS: Record<EventPriority, string> = {
  [EventPriority.LOW]: '#6b7280',
  [EventPriority.MEDIUM]: '#3b82f6',
  [EventPriority.HIGH]: '#f59e0b',
  [EventPriority.CRITICAL]: '#dc2626',
};

export interface FullCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: { event: CalendarEvent };
}

export function eventToFullCalendarFormat(event: CalendarEvent): FullCalendarEvent {
  const color = event.color || EVENT_TYPE_COLORS[event.type];
  return {
    id: String(event.id),
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    allDay: event.allDay,
    backgroundColor: color,
    borderColor: event.priority === EventPriority.CRITICAL ? '#dc2626' : color,
    extendedProps: { event },
  };
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (query: CalendarEventQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | boolean> = {
        startDate: query.startDate,
        endDate: query.endDate,
      };
      if (query.type) params.type = query.type;
      if (query.priority) params.priority = query.priority;
      if (query.status) params.status = query.status;
      if (query.assignedToId) params.assignedToId = query.assignedToId;
      if (query.myEventsOnly) params.myEventsOnly = true;
      const res = await calendarAPI.getEvents(params);
      setEvents(res.data);
      return res.data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Erreur de chargement du calendrier';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = useCallback(
    async (dto: Record<string, unknown>) => {
      const res = await calendarAPI.createEvent(dto);
      return res.data;
    },
    [],
  );

  const updateEvent = useCallback(
    async (id: number, dto: Record<string, unknown>) => {
      const res = await calendarAPI.updateEvent(id, dto);
      return res.data;
    },
    [],
  );

  const deleteEvent = useCallback(async (id: number) => {
    await calendarAPI.deleteEvent(id);
  }, []);

  const completeEvent = useCallback(
    async (id: number, note?: string) => {
      const res = await calendarAPI.completeEvent(id, note);
      return res.data;
    },
    [],
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await calendarAPI.getStats();
      setStats(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authAPI.getMyAgents();
      setAgents(res.data);
      return res.data;
    } catch {
      setAgents([]);
      return [];
    }
  }, []);

  return {
    events,
    stats,
    agents,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    completeEvent,
    fetchStats,
    fetchAgents,
    setEvents,
  };
}