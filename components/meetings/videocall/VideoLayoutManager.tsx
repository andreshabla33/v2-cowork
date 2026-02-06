'use client';

import React, { useMemo } from 'react';
import { Track } from 'livekit-client';
import { TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { ParticipantAvatar } from './ParticipantAvatar';
import { ScreenShareViewer } from './ScreenShareViewer';
import { ViewMode } from './ViewModeSelector';

interface VideoLayoutManagerProps {
  tracks: TrackReferenceOrPlaceholder[];
  viewMode: ViewMode;
  screenShareTrack?: TrackReferenceOrPlaceholder;
  activeSpeaker?: string;
  renderParticipant: (track: TrackReferenceOrPlaceholder, index: number) => React.ReactNode;
  renderScreenShare?: (track: TrackReferenceOrPlaceholder) => React.ReactNode;
}

export const VideoLayoutManager: React.FC<VideoLayoutManagerProps> = ({
  tracks,
  viewMode,
  screenShareTrack,
  activeSpeaker,
  renderParticipant,
  renderScreenShare,
}) => {
  const hasScreenShare = !!screenShareTrack;
  
  const videoTracks = useMemo(() => 
    tracks.filter(t => t.source !== Track.Source.ScreenShare),
    [tracks]
  );

  const sortedTracks = useMemo(() => {
    if (!activeSpeaker) return videoTracks;
    return [...videoTracks].sort((a, b) => {
      const aIsSpeaker = a.participant?.identity === activeSpeaker;
      const bIsSpeaker = b.participant?.identity === activeSpeaker;
      if (aIsSpeaker && !bIsSpeaker) return -1;
      if (!aIsSpeaker && bIsSpeaker) return 1;
      return 0;
    });
  }, [videoTracks, activeSpeaker]);

  const getGridCols = (count: number): string => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 12) return 'grid-cols-4';
    return 'grid-cols-4 lg:grid-cols-5';
  };

  if (hasScreenShare && viewMode === 'sidebar') {
    return (
      <div className="h-full w-full flex gap-2 p-2">
        {/* Pantalla compartida - área principal */}
        <div className="flex-1 min-w-0">
          <ScreenShareViewer
            isActive={true}
            sharerName={screenShareTrack?.participant?.name || screenShareTrack?.participant?.identity}
          >
            {renderScreenShare?.(screenShareTrack)}
          </ScreenShareViewer>
        </div>
        
        {/* Strip lateral de participantes */}
        <div className="w-48 lg:w-56 flex flex-col gap-2 overflow-y-auto">
          {sortedTracks.map((track, index) => (
            <div
              key={track.participant?.identity || index}
              className="aspect-video rounded-lg overflow-hidden bg-zinc-900 shrink-0"
            >
              {renderParticipant(track, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasScreenShare) {
    return (
      <div className="h-full w-full flex flex-col gap-2 p-2">
        {/* Pantalla compartida - área principal */}
        <div className="flex-1 min-h-0">
          <ScreenShareViewer
            isActive={true}
            sharerName={screenShareTrack?.participant?.name || screenShareTrack?.participant?.identity}
          >
            {renderScreenShare?.(screenShareTrack)}
          </ScreenShareViewer>
        </div>
        
        {/* Strip inferior de participantes */}
        <div className="h-24 lg:h-32 flex gap-2 overflow-x-auto pb-2">
          {sortedTracks.map((track, index) => (
            <div
              key={track.participant?.identity || index}
              className="aspect-video h-full rounded-lg overflow-hidden bg-zinc-900 shrink-0"
            >
              {renderParticipant(track, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'speaker' && sortedTracks.length > 1) {
    const speakerTrack = sortedTracks[0];
    const otherTracks = sortedTracks.slice(1);
    
    return (
      <div className="h-full w-full flex flex-col gap-2 p-2">
        {/* Speaker principal */}
        <div className="flex-1 min-h-0">
          <div className="h-full w-full rounded-xl overflow-hidden bg-zinc-900">
            {renderParticipant(speakerTrack, 0)}
          </div>
        </div>
        
        {/* Otros participantes en strip */}
        <div className="h-24 lg:h-28 flex gap-2 overflow-x-auto justify-center">
          {otherTracks.map((track, index) => (
            <div
              key={track.participant?.identity || index}
              className="aspect-video h-full rounded-lg overflow-hidden bg-zinc-900 shrink-0"
            >
              {renderParticipant(track, index + 1)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full grid ${getGridCols(sortedTracks.length)} gap-2 p-2 auto-rows-fr`}>
      {sortedTracks.map((track, index) => (
        <div
          key={track.participant?.identity || index}
          className="rounded-xl overflow-hidden bg-zinc-900 min-h-0"
        >
          {renderParticipant(track, index)}
        </div>
      ))}
    </div>
  );
};

export default VideoLayoutManager;
