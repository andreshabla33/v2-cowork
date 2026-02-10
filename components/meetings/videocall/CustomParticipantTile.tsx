'use client';

import React, { useMemo } from 'react';
import { 
  useParticipantTile,
  TrackReferenceOrPlaceholder,
  VideoTrack,
  AudioTrack,
  useMaybeTrackRefContext,
  useEnsureTrackRef,
  ParticipantContextIfNeeded,
  TrackRefContextIfNeeded,
} from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { ParticipantAvatar } from './ParticipantAvatar';

interface CustomParticipantTileProps {
  trackRef?: TrackReferenceOrPlaceholder;
  participant?: Participant;
  avatarUrl?: string;
  onParticipantClick?: (participant: Participant) => void;
  disableVideo?: boolean;
  className?: string;
}

export const CustomParticipantTile: React.FC<CustomParticipantTileProps> = ({
  trackRef,
  participant: participantProp,
  avatarUrl,
  onParticipantClick,
  disableVideo = false,
  className = '',
}) => {
  const maybeTrackRef = useMaybeTrackRefContext();
  const trackReference = useEnsureTrackRef(trackRef ?? maybeTrackRef);
  
  const participant = participantProp || trackReference?.participant;
  
  // Obtener avatar de metadata si no se pasa como prop
  const metadataAvatar = useMemo(() => {
    if (participant?.metadata) {
      try {
        const meta = JSON.parse(participant.metadata);
        return meta.avatarUrl || meta.avatar_url || meta.profilePhoto;
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [participant?.metadata]);

  const finalAvatarUrl = avatarUrl || metadataAvatar;

  const isVideoEnabled = trackReference?.publication?.isSubscribed && 
                         trackReference?.publication?.track?.isMuted === false;
  const isAudioEnabled = participant?.isMicrophoneEnabled;
  const isSpeaking = participant?.isSpeaking;
  
  const participantName = participant?.name || participant?.identity || 'Participante';

  const handleClick = () => {
    if (participant && onParticipantClick) {
      onParticipantClick(participant);
    }
  };

  return (
    <ParticipantContextIfNeeded participant={participant}>
      <TrackRefContextIfNeeded trackRef={trackReference}>
        <div
          className={`
            relative w-fullfin lAh-full bg-zinc-900 overflow-hidden
            ${isSpeaking ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-zinc-900' : ''}
            ${className}
          `}
          onClick={handleClick}
        >
          {/* Video o Avatar */}
          {isVideoEnabled && !disableVideo && trackReference?.publication?.track ? (
            <VideoTrack
              trackRef={trackReference as any}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <ParticipantAvatar
                name={participantName}
                avatarUrl={avatarUrl}
                size="lg"
                isSpeaking={isSpeaking}
              />
            </div>
          )}

          {/* Overlay con nombre y estados */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Indicador de audio */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center
                  ${isAudioEnabled ? 'bg-white/20' : 'bg-red-500/80'}
                `}>
                  {isAudioEnabled ? (
                    isSpeaking ? (
                      <svg className="w-3.5 h-3.5 text-green-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    )
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                    </svg>
                  )}
                </div>
                
                {/* Nombre */}
                <span className="text-white text-sm font-medium truncate max-w-[150px]">
                  {participantName}
                </span>
              </div>
              
              {/* Indicador de cámara apagada */}
              {!isVideoEnabled && (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Indicador de conexión pobre (opcional) */}
          {participant?.connectionQuality === 'poor' && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/80 flex items-center justify-center" title="Conexión débil">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                </svg>
              </div>
            </div>
          )}

          {/* Audio track (invisible) */}
          {trackReference?.source === Track.Source.Microphone && trackReference?.publication && (
            <AudioTrack trackRef={trackReference as any} />
          )}
        </div>
      </TrackRefContextIfNeeded>
    </ParticipantContextIfNeeded>
  );
};

export default CustomParticipantTile;
