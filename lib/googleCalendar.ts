const GOOGLE_CLIENT_ID = '628870318014-35io6nhdj8rld9de0ng5voorrmr2neq4.apps.googleusercontent.com';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string; responseStatus: string }[];
  htmlLink?: string;
}

export const googleCalendar = {
  getAuthUrl: () => {
    const redirectUri = window.location.origin;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  parseHashToken: (hash: string): string | null => {
    const params = new URLSearchParams(hash.replace('#', ''));
    return params.get('access_token');
  },

  saveToken: (token: string) => {
    localStorage.setItem('google_calendar_token', token);
  },

  getToken: (): string | null => {
    return localStorage.getItem('google_calendar_token');
  },

  removeToken: () => {
    localStorage.removeItem('google_calendar_token');
  },

  isConnected: (): boolean => {
    return !!localStorage.getItem('google_calendar_token');
  },

  fetchEvents: async (timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> => {
    const token = googleCalendar.getToken();
    if (!token) throw new Error('No hay token de Google Calendar');

    const params = new URLSearchParams({
      maxResults: '50',
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        googleCalendar.removeToken();
        throw new Error('Token expirado');
      }
      throw new Error('Error al obtener eventos');
    }

    const data = await response.json();
    return data.items || [];
  },

  createEvent: async (event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees?: string[];
  }): Promise<GoogleCalendarEvent & { hangoutLink?: string }> => {
    const token = googleCalendar.getToken();
    if (!token) throw new Error('No hay token de Google Calendar');

    const body = {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: event.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      attendees: event.attendees?.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        googleCalendar.removeToken();
        throw new Error('Token expirado');
      }
      const errorData = await response.json();
      console.error('Google Calendar API Error:', errorData);
      throw new Error('Error al crear evento');
    }

    return response.json();
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    const token = googleCalendar.getToken();
    if (!token) throw new Error('No hay token de Google Calendar');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      if (response.status === 401) {
        googleCalendar.removeToken();
        throw new Error('Token expirado');
      }
      throw new Error('Error al eliminar evento');
    }
  }
};

export default googleCalendar;
