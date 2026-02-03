import React from 'react';

interface SettingSliderProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const SettingSlider: React.FC<SettingSliderProps> = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  disabled = false
}) => {
  return (
    <div className="py-4 border-b border-white/[0.05] last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {description && (
            <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-sm font-bold text-violet-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          background: `linear-gradient(to right, #8b5cf6 0%, #d946ef ${((value - min) / (max - min)) * 100}%, #3f3f46 ${((value - min) / (max - min)) * 100}%, #3f3f46 100%)`
        }}
      />
    </div>
  );
};

export default SettingSlider;
