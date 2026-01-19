
import React from 'react';
import { WorldSettings, BiomeType } from '../types';

interface SettingsPanelProps {
  settings: WorldSettings;
  onUpdate: (settings: WorldSettings) => void;
  onRegenerate: () => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onRegenerate, onClose }) => {
  const biomes: BiomeType[] = ['plains', 'mountains', 'desert', 'ocean'];

  const handleSliderChange = (key: keyof WorldSettings, value: string) => {
    onUpdate({ ...settings, [key]: parseFloat(value) });
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden pointer-events-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-2">
             <span className="text-blue-400">⚙️</span> World Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-8 space-y-8">
          {/* Biome Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Biome Type</label>
            <div className="grid grid-cols-2 gap-2">
              {biomes.map(b => (
                <button
                  key={b}
                  onClick={() => onUpdate({ ...settings, biome: b })}
                  className={`px-4 py-2 rounded-lg font-bold border-2 transition-all capitalize
                    ${settings.biome === b ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}
                  `}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Terrain Height Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-gray-400 uppercase tracking-wider">Terrain Base Height</label>
              <span className="text-blue-400 font-mono">{settings.terrainHeight}</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={settings.terrainHeight}
              onChange={(e) => handleSliderChange('terrainHeight', e.target.value)}
              className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Noise Frequency Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-gray-400 uppercase tracking-wider">Noise Frequency</label>
              <span className="text-blue-400 font-mono">{settings.noiseFrequency.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={settings.noiseFrequency}
              onChange={(e) => handleSliderChange('noiseFrequency', e.target.value)}
              className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Noise Amplitude Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-gray-400 uppercase tracking-wider">Noise Amplitude</label>
              <span className="text-blue-400 font-mono">{settings.noiseAmplitude}</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={settings.noiseAmplitude}
              onChange={(e) => handleSliderChange('noiseAmplitude', e.target.value)}
              className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Render Distance Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <label className="font-semibold text-gray-400 uppercase tracking-wider">Render Distance (Chunks)</label>
              <span className="text-blue-400 font-mono">{settings.renderDistance}</span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={settings.renderDistance}
              onChange={(e) => handleSliderChange('renderDistance', e.target.value)}
              className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-4">
            <button
              onClick={onRegenerate}
              className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all transform active:scale-95"
            >
              Regenerate World
            </button>
            <button
              onClick={onClose}
              className="px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all"
            >
              Back to Game
            </button>
          </div>
        </div>

        <div className="p-4 bg-black/20 text-center text-[10px] text-gray-600 uppercase tracking-widest border-t border-white/5">
          Generation logic uses sine-octave terrain synthesis
        </div>
      </div>
    </div>
  );
};
