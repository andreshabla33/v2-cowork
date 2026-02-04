import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { ScheduledMeeting } from '../../types';
import { googleCalendar, GoogleCalendarEvent } from '../../lib/googleCalendar';

interface CalendarPanelProps {
  onJoinMeeting?: (salaId: string) => void;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ onJoinMeeting }) => {
  const { currentUser, activeWorkspace, theme } = useStore();
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'notes'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [miembrosEspacio, setMiembrosEspacio] = useState<any[]>([]);
  const [googleConnected, setGoogleConnected] = useState(googleCalendar.isConnected());
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  const [newMeeting, setNewMeeting] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    participantes: [] as string[],
    recordatorio_minutos: 15
  });

  const loadMeetings = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('reuniones_programadas')
      .select('*')
      .eq('espacio_id', activeWorkspace.id)
      .order('fecha_inicio', { ascending: true });

    console.log('Reuniones cargadas:', data, 'Error:', error);
    
    if (!error && data) {
      setMeetings(data as any);
    } else if (error) {
      console.error('Error cargando reuniones:', error);
    }
    setLoading(false);
  }, [activeWorkspace?.id]);

  const loadMiembros = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    
    const { data } = await supabase
      .from('miembros_espacio')
      .select('usuario_id')
      .eq('espacio_id', activeWorkspace.id)
      .eq('aceptado', true);

    if (data) {
      const ids = data.map((m: any) => m.usuario_id);
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .in('id', ids);
      
      if (usuarios) setMiembrosEspacio(usuarios);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadMeetings();
    loadMiembros();

    if (!activeWorkspace?.id) return;
    
    const channel = supabase.channel(`calendar_${activeWorkspace.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reuniones_programadas',
        filter: `espacio_id=eq.${activeWorkspace.id}`
      }, () => loadMeetings())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace?.id, loadMeetings, loadMiembros]);

  const createMeeting = async () => {
    if (!newMeeting.titulo.trim() || !newMeeting.fecha || !newMeeting.hora_inicio || !activeWorkspace?.id) return;

    const fechaInicio = new Date(`${newMeeting.fecha}T${newMeeting.hora_inicio}`);
    const fechaFin = newMeeting.hora_fin 
      ? new Date(`${newMeeting.fecha}T${newMeeting.hora_fin}`)
      : new Date(fechaInicio.getTime() + 60 * 60 * 1000);

    // Generar link de meeting único (se actualizará con Google Meet si está conectado)
    const meetingCode = Math.random().toString(36).substring(2, 10);
    let meetingLink = `${window.location.origin}/meet/${meetingCode}`;
    let googleEventId: string | null = null;

    // Obtener emails de participantes para invitaciones
    let participantesEmails: string[] = [];
    if (newMeeting.participantes.length > 0) {
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, email')
        .in('id', newMeeting.participantes);
      
      if (usuariosData) {
        participantesEmails = usuariosData
          .map(u => u.email)
          .filter((email): email is string => !!email);
      }
    }

    // Crear evento en Google Calendar PRIMERO si está conectado
    if (googleConnected) {
      try {
        const descripcionCompleta = newMeeting.descripcion.trim() 
          ? `${newMeeting.descripcion.trim()}\n\n---\nReunión creada en Cowork Virtual`
          : 'Reunión creada en Cowork Virtual';

        const googleEvent = await googleCalendar.createEvent({
          summary: newMeeting.titulo.trim(),
          description: descripcionCompleta,
          start: fechaInicio.toISOString(),
          end: fechaFin.toISOString(),
          attendees: participantesEmails, // Envía invitaciones por email
          sendUpdates: 'all' // Notificar a todos los invitados
        });
        
        if (googleEvent) {
          googleEventId = googleEvent.id;
          
          // Usar Google Meet link si se creó
          if (googleEvent.hangoutLink) {
            meetingLink = googleEvent.hangoutLink;
          }
        }
      } catch (err) {
        console.error('Error creando evento en Google Calendar:', err);
        // Continuar sin Google Calendar
      }
    }

    // Crear reunión en Supabase
    const { data: meeting, error } = await supabase
      .from('reuniones_programadas')
      .insert({
        espacio_id: activeWorkspace.id,
        titulo: newMeeting.titulo.trim(),
        descripcion: newMeeting.descripcion.trim() || null,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        creado_por: currentUser.id,
        recordatorio_minutos: newMeeting.recordatorio_minutos,
        meeting_link: meetingLink,
        google_event_id: googleEventId
      })
      .select()
      .single();

    if (!error && meeting) {
      // Insertar participantes
      if (newMeeting.participantes.length > 0) {
        const participantesData = newMeeting.participantes.map(uid => ({
          reunion_id: meeting.id,
          usuario_id: uid,
          estado: 'pendiente'
        }));
        await supabase.from('reunion_participantes').insert(participantesData);
      }

      setShowScheduleModal(false);
      resetNewMeeting();
      loadMeetings();
      syncGoogleEvents();
    }
  };

  const resetNewMeeting = () => {
    setNewMeeting({
      titulo: '',
      descripcion: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      participantes: [],
      recordatorio_minutos: 15
    });
  };

  const respondToMeeting = async (meetingId: string, estado: 'aceptado' | 'rechazado' | 'tentativo') => {
    await supabase
      .from('reunion_participantes')
      .update({ estado })
      .eq('reunion_id', meetingId)
      .eq('usuario_id', currentUser.id);
    
    loadMeetings();
  };

  const deleteMeeting = async (meetingId: string, googleEventId?: string) => {
    // Eliminar de Google Calendar PRIMERO si está conectado y tiene ID
    // Esto envía notificación de cancelación a los invitados
    if (googleConnected && googleEventId) {
      try {
        await googleCalendar.deleteEvent(googleEventId, 'all'); // 'all' = notificar a invitados
        console.log('Evento eliminado de Google Calendar:', googleEventId);
      } catch (err) {
        console.error('Error eliminando de Google Calendar:', err);
        // Continuar con la eliminación local aunque falle Google
      }
    }
    
    // Eliminar de Supabase (esto activará el trigger que notifica a participantes)
    
    // Actualización optimista: eliminar de la UI inmediatamente
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
    
    const { error, count } = await supabase
      .from('reuniones_programadas')
      .delete({ count: 'exact' })
      .eq('id', meetingId);
    
    if (error) {
      console.error('Error eliminando reunión:', error);
      // Revertir si hubo error (recargar)
      loadMeetings();
      alert('Error al eliminar la reunión: ' + error.message);
    } else if (count === 0) {
      // Si no se borró nada (por RLS), recargar para mostrar estado real
      console.warn('No se pudo eliminar la reunión (posible restricción de permisos)');
      loadMeetings();
    }
    
    // Sincronizar Google por si acaso
    syncGoogleEvents();
  };

  const connectGoogleCalendar = () => {
    window.location.href = googleCalendar.getAuthUrl();
  };

  const disconnectGoogleCalendar = () => {
    googleCalendar.removeToken();
    setGoogleConnected(false);
    setGoogleEvents([]);
  };

  const syncGoogleEvents = useCallback(async () => {
    if (!googleCalendar.isConnected()) return;
    
    setSyncingGoogle(true);
    try {
      const events = await googleCalendar.fetchEvents();
      setGoogleEvents(events);
    } catch (error: any) {
      console.error('Error sincronizando Google Calendar:', error);
      if (error.message === 'Token expirado') {
        setGoogleConnected(false);
      }
    }
    setSyncingGoogle(false);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const token = googleCalendar.parseHashToken(hash);
      if (token) {
        googleCalendar.saveToken(token);
        setGoogleConnected(true);
        window.history.replaceState(null, '', window.location.pathname);
        syncGoogleEvents();
      }
    }
  }, [syncGoogleEvents]);

  useEffect(() => {
    if (googleConnected) {
      syncGoogleEvents();
    }
  }, [googleConnected, syncGoogleEvents]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
    return date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const isCreator = (meeting: ScheduledMeeting) => meeting.creado_por === currentUser.id;
  
  const getMyParticipation = (meeting: ScheduledMeeting) => 
    meeting.participantes?.find(p => p.usuario_id === currentUser.id);

  const isMeetingNow = (meeting: ScheduledMeeting) => {
    const now = new Date();
    const start = new Date(meeting.fecha_inicio);
    const end = new Date(meeting.fecha_fin);
    return now >= start && now <= end;
  };

  const isMeetingSoon = (meeting: ScheduledMeeting) => {
    const now = new Date();
    const start = new Date(meeting.fecha_inicio);
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= 15;
  };

  const toggleParticipant = (userId: string) => {
    setNewMeeting(prev => ({
      ...prev,
      participantes: prev.participantes.includes(userId)
        ? prev.participantes.filter(id => id !== userId)
        : [...prev.participantes, userId]
    }));
  };

  const filteredMeetings = meetings.filter(m => 
    m.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(m => {
      const meetingDate = new Date(m.fecha_inicio);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const themeStyles = {
    dark: {
      bg: 'bg-[#1a1a2e]',
      card: 'bg-white/5 border-white/10 hover:bg-white/10',
      cardActive: 'bg-indigo-500/20 border-indigo-500/50',
      btn: 'bg-indigo-600 hover:bg-indigo-500',
      btnGoogle: 'bg-white text-gray-800 hover:bg-gray-100',
      input: 'bg-white/5 border-white/10 focus:border-indigo-500/50'
    },
    arcade: {
      bg: 'bg-black',
      card: 'bg-black border-[#00ff41]/30 hover:border-[#00ff41]/60',
      cardActive: 'bg-[#00ff41]/10 border-[#00ff41]',
      btn: 'bg-[#00ff41] text-black hover:bg-white',
      btnGoogle: 'bg-[#00ff41] text-black hover:bg-white',
      input: 'bg-black border-[#00ff41]/30 focus:border-[#00ff41]'
    }
  };

  const s = themeStyles[theme as keyof typeof themeStyles] || themeStyles.dark;

  return (
    <div className={`${s.bg}`}>
      {/* Header */}
      <div className="p-5 lg:p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4 lg:mb-3">
          <h1 className={`text-xl font-bold ${theme === 'arcade' ? 'text-[#00ff41]' : ''}`}>
            Calendario
          </h1>
          <button
            onClick={() => setShowScheduleModal(true)}
            className={`flex items-center gap-2 px-5 py-2.5 ${s.btn} rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nueva reunión
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3 lg:mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar eventos..."
            className={`w-full ${s.input} border rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none transition-all`}
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] opacity-40 font-mono">
            <span className="px-1.5 py-0.5 bg-white/10 rounded">Ctrl</span>
            <span className="px-1.5 py-0.5 bg-white/10 rounded">F</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'scheduled' 
                ? (theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-indigo-600 text-white') 
                : 'opacity-50 hover:opacity-100'
            }`}
          >
            Programadas
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'notes' 
                ? (theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-indigo-600 text-white') 
                : 'opacity-50 hover:opacity-100'
            }`}
          >
            Notas de reunión
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className={`w-10 h-10 border-3 ${theme === 'arcade' ? 'border-[#00ff41]' : 'border-indigo-500'} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : activeTab === 'scheduled' ? (
          <>
            {/* Mini Calendar */}
            <div className={`rounded-xl p-4 mb-4 ${theme === 'arcade' ? 'bg-zinc-900/50 border border-[#00ff41]/20' : 'bg-zinc-800/50 border border-zinc-700/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className={`font-bold text-sm ${theme === 'arcade' ? 'text-[#00ff41]' : 'text-white'}`}>
                  {selectedDate.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => (
                  <div key={day} className="text-[10px] font-bold text-zinc-400 py-1">{day}</div>
                ))}
                {getDaysInMonth(selectedDate).map((date, i) => {
                  if (!date) return <div key={i} className="p-1" />;
                  
                  const dayMeetings = getMeetingsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date < new Date(new Date().setHours(0,0,0,0));

                  const handleDayClick = () => {
                    if (!isPast) {
                      const dateStr = date.toISOString().split('T')[0];
                      setNewMeeting(prev => ({ ...prev, fecha: dateStr }));
                      setShowScheduleModal(true);
                    }
                  };

                  return (
                    <div
                      key={i}
                      onClick={handleDayClick}
                      className={`p-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${
                        isPast ? 'text-zinc-600 cursor-not-allowed' :
                        isToday 
                          ? (theme === 'arcade' ? 'bg-[#00ff41] text-black font-bold' : 'bg-indigo-500 text-white font-bold') 
                          : dayMeetings.length > 0 
                            ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' 
                            : 'text-zinc-300 hover:bg-white/10'
                      }`}
                      title={isPast ? 'Fecha pasada' : 'Click para crear reunión'}
                    >
                      {date.getDate()}
                      {dayMeetings.length > 0 && (
                        <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${theme === 'arcade' ? 'bg-[#00ff41]' : 'bg-indigo-400'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Meetings List */}
            {filteredMeetings.length === 0 ? (
              <div className="text-center py-6">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl ${theme === 'arcade' ? 'bg-[#00ff41]/10' : 'bg-indigo-500/10'} flex items-center justify-center`}>
                  <svg className={`w-8 h-8 ${theme === 'arcade' ? 'text-[#00ff41]/40' : 'opacity-30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs opacity-60">Administra tu agenda y mejora la experiencia de tus reuniones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMeetings.map(meeting => {
                  const participation = getMyParticipation(meeting);
                  const isNow = isMeetingNow(meeting);
                  const isSoon = isMeetingSoon(meeting);

                  return (
                    <div
                      key={meeting.id}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isNow ? 'bg-green-500/20 border-green-500/50' : 
                        isSoon ? 'bg-amber-500/10 border-amber-500/30' : 
                        s.card
                      }`}
                    >
                      {isNow && (
                        <div className={`absolute -top-2 -right-2 px-2.5 py-1 ${theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-green-500'} rounded-full text-[9px] font-black uppercase animate-pulse`}>
                          EN VIVO
                        </div>
                      )}
                      {isSoon && !isNow && (
                        <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-amber-500 text-black rounded-full text-[9px] font-black uppercase">
                          EN 15 MIN
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold truncate">{meeting.titulo}</h4>
                            {isCreator(meeting) && (
                              <span className={`px-2 py-0.5 ${theme === 'arcade' ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-indigo-500/20 text-indigo-300'} rounded text-[9px] font-bold`}>
                                ORGANIZADOR
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm opacity-60 mb-2">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDateShort(meeting.fecha_inicio)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatTime(meeting.fecha_inicio)} - {formatTime(meeting.fecha_fin)}
                            </span>
                          </div>

                          {meeting.descripcion && (
                            <p className="text-sm opacity-50 mb-3 line-clamp-2">{meeting.descripcion}</p>
                          )}

                          {meeting.participantes && meeting.participantes.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {meeting.participantes.slice(0, 5).map(p => (
                                  <div
                                    key={p.id}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${s.bg} ${
                                      p.estado === 'aceptado' ? 'bg-green-500/30 text-green-300' :
                                      p.estado === 'rechazado' ? 'bg-red-500/30 text-red-300' :
                                      p.estado === 'tentativo' ? 'bg-amber-500/30 text-amber-300' :
                                      'bg-white/10'
                                    }`}
                                    title={`${p.usuario?.nombre} (${p.estado})`}
                                  >
                                    {p.usuario?.nombre?.charAt(0) || '?'}
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs opacity-50">
                                {meeting.participantes.filter(p => p.estado === 'aceptado').length} confirmados
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {isNow && meeting.sala_id && (
                            <button
                              onClick={() => onJoinMeeting?.(meeting.sala_id!)}
                              className={`px-4 py-2 ${theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-green-500'} hover:opacity-80 rounded-xl text-xs font-bold transition-all`}
                            >
                              Unirse
                            </button>
                          )}

                          {participation && !isCreator(meeting) && participation.estado === 'pendiente' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => respondToMeeting(meeting.id, 'aceptado')}
                                className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg transition-all"
                                title="Aceptar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => respondToMeeting(meeting.id, 'tentativo')}
                                className="p-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 rounded-lg transition-all"
                                title="Quizás"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => respondToMeeting(meeting.id, 'rechazado')}
                                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-all"
                                title="Rechazar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}

                          {isCreator(meeting) && (
                            <button
                              onClick={() => deleteMeeting(meeting.id, meeting.google_event_id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                              title="Cancelar reunión"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Meeting Notes Tab */
          <div className="text-center py-16">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-3xl ${theme === 'arcade' ? 'bg-[#00ff41]/10' : 'bg-indigo-500/10'} flex items-center justify-center`}>
              <svg className={`w-12 h-12 ${theme === 'arcade' ? 'text-[#00ff41]/40' : 'opacity-30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="font-bold mb-2">Notas de Reunión</h4>
            <p className="text-sm opacity-50 mb-1">Las notas de reuniones con AI</p>
            <p className="text-sm opacity-50">estarán disponibles próximamente</p>
            <span className={`inline-block mt-4 px-3 py-1 ${theme === 'arcade' ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-indigo-500/20 text-indigo-300'} rounded-full text-xs font-bold`}>
              Fase 2
            </span>
          </div>
        )}
      </div>

      {/* Google Calendar Button */}
      <div className="px-6 pb-6">
        {googleConnected ? (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Google Calendar conectado
              {syncingGoogle && <span className="opacity-60">(sincronizando...)</span>}
            </div>
            <button
              onClick={disconnectGoogleCalendar}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <button
            onClick={connectGoogleCalendar}
            className={`flex items-center justify-center gap-2 px-4 py-2 mx-auto ${s.btnGoogle} rounded-xl text-sm font-medium transition-all hover:opacity-90`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            Conectar Google Calendar
          </button>
        )}
      </div>

      {/* Modal Nueva Reunión - Compacto 2026 */}
      {showScheduleModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-3"
          onClick={() => setShowScheduleModal(false)}
        >
          <div 
            className={`w-full max-w-md lg:max-w-sm rounded-2xl lg:rounded-xl ${s.bg} border border-white/10 shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 lg:p-3 border-b border-white/10 ${theme === 'arcade' ? 'bg-[#00ff41]/5' : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10'}`}>
              <div className="flex items-center gap-3 lg:gap-2">
                <div className={`w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg ${theme === 'arcade' ? 'bg-[#00ff41]' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex items-center justify-center`}>
                  <svg className={`w-5 h-5 lg:w-4 lg:h-4 ${theme === 'arcade' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg lg:text-base font-bold">Nueva Reunión</h3>
                  <p className="text-xs lg:text-[10px] opacity-50">Programa y envía invitaciones</p>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-3 space-y-3 lg:space-y-2 max-h-[55vh] lg:max-h-[50vh] overflow-y-auto">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Título *</label>
                <input
                  type="text"
                  value={newMeeting.titulo}
                  onChange={e => setNewMeeting({ ...newMeeting, titulo: e.target.value })}
                  placeholder="Ej: Daily Standup..."
                  className={`w-full ${s.input} border rounded-lg px-3 py-2 lg:py-1.5 text-sm lg:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={newMeeting.fecha}
                    onChange={e => setNewMeeting({ ...newMeeting, fecha: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full ${s.input} border rounded-lg px-2 py-2 lg:py-1.5 text-xs focus:outline-none transition-all`}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Inicio *</label>
                  <input
                    type="time"
                    value={newMeeting.hora_inicio}
                    onChange={e => setNewMeeting({ ...newMeeting, hora_inicio: e.target.value })}
                    className={`w-full ${s.input} border rounded-lg px-2 py-2 lg:py-1.5 text-xs focus:outline-none transition-all`}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Fin</label>
                  <input
                    type="time"
                    value={newMeeting.hora_fin}
                    onChange={e => setNewMeeting({ ...newMeeting, hora_fin: e.target.value })}
                    className={`w-full ${s.input} border rounded-lg px-2 py-2 lg:py-1.5 text-xs focus:outline-none transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Descripción</label>
                <textarea
                  value={newMeeting.descripcion}
                  onChange={e => setNewMeeting({ ...newMeeting, descripcion: e.target.value })}
                  placeholder="Agenda o detalles..."
                  rows={2}
                  className={`w-full ${s.input} border rounded-lg px-3 py-2 lg:py-1.5 text-sm lg:text-xs focus:outline-none transition-all resize-none`}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Recordatorio</label>
                <select
                  value={newMeeting.recordatorio_minutos}
                  onChange={e => setNewMeeting({ ...newMeeting, recordatorio_minutos: parseInt(e.target.value) })}
                  className={`w-full ${s.input} border rounded-lg px-3 py-2 lg:py-1.5 text-sm lg:text-xs focus:outline-none transition-all`}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value={5} className="bg-zinc-800 text-white">5 min antes</option>
                  <option value={10} className="bg-zinc-800 text-white">10 min antes</option>
                  <option value={15} className="bg-zinc-800 text-white">15 min antes</option>
                  <option value={30} className="bg-zinc-800 text-white">30 min antes</option>
                  <option value={60} className="bg-zinc-800 text-white">1 hora antes</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5 lg:mb-1">Participantes</label>
                <div className={`${s.input} border rounded-lg p-2 max-h-28 lg:max-h-24 overflow-y-auto`}>
                  {miembrosEspacio.filter(m => m.id !== currentUser.id).length === 0 ? (
                    <p className="text-xs opacity-40 text-center py-1">No hay otros miembros</p>
                  ) : (
                    <div className="space-y-0.5">
                      {miembrosEspacio.filter(m => m.id !== currentUser.id).map(member => (
                        <button
                          key={member.id}
                          onClick={() => toggleParticipant(member.id)}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                            newMeeting.participantes.includes(member.id)
                              ? (theme === 'arcade' ? 'bg-[#00ff41]/20 border border-[#00ff41]/50' : 'bg-indigo-500/20 border border-indigo-500/50')
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            newMeeting.participantes.includes(member.id) 
                              ? (theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-indigo-500') 
                              : 'bg-white/10'
                          }`}>
                            {member.nombre?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs font-medium flex-1 text-left truncate">{member.nombre}</span>
                          {newMeeting.participantes.includes(member.id) && (
                            <svg className={`w-3.5 h-3.5 ${theme === 'arcade' ? 'text-[#00ff41]' : 'text-indigo-400'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => { setShowScheduleModal(false); resetNewMeeting(); }}
                className="flex-1 px-3 py-2.5 lg:py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm lg:text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={createMeeting}
                disabled={!newMeeting.titulo.trim() || !newMeeting.fecha || !newMeeting.hora_inicio}
                className={`flex-1 px-3 py-2.5 lg:py-2 ${s.btn} disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm lg:text-xs font-bold transition-all shadow-lg`}
              >
                Programar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPanel;
