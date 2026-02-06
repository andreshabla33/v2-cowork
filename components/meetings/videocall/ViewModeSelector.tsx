'use client';

import React from 'react';

export type ViewMode = 'gallery' | 'speaker' | 'sidebar';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  hasScreenShare?: boolean;
  participantCount?: number;
}

const viewModes = [
  {
    id: 'gallery' as ViewMode,
    label: 'Galería',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    description: 'Ver a todos los participantes',
  },
  {
    id: 'speaker' as ViewMode,
    label: 'Orador',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Enfoque en quien habla',
  },
  {
    id: 'sidebar' as ViewMode,
    label: 'Lateral',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    description: 'Pantalla + participantes al lado',
  },
];

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onChange,
  hasScreenShare = false,
  participantCount = 0,
}) => {
  const availableModes = viewModes.filter((mode) => {
    if (mode.id === 'sidebar' && !hasScreenShare) return false;
    if (mode.id === 'gallery' && participantCount < 2) return false;
    return true;
  });

  if (availableModes.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
      {availableModes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
            transition-all duration-200
            ${currentMode === mode.id
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
            }
          `}
          title={mode.description}
        >
          {mode.icon}
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeSelector;
