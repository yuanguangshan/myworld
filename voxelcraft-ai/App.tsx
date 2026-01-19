
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoxelEngine } from './components/VoxelEngine';
import { GeminiPanel } from './components/GeminiPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Hotbar } from './components/Hotbar';
import { GameStats, BlockType, WorldSettings } from './types';
import { BLOCK_DATA, DEFAULT_WORLD_SETTINGS } from './constants';

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>('grass');
  const [stats, setStats] = useState<GameStats>({ blocksPlaced: 0, blocksBroken: 0, fps: 0 });
  const [showGemini, setShowGemini] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [worldSettings, setWorldSettings] = useState<WorldSettings>(DEFAULT_WORLD_SETTINGS);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 });
  
  const engineRef = useRef<any>(null);

  const handleStart = () => {
    setGameStarted(true);
    document.body.requestPointerLock();
  };

  const handleEngineUpdate = useCallback((newStats: GameStats, pos: { x: number, y: number, z: number }) => {
    setStats(prev => ({ ...prev, ...newStats }));
    setPlayerPosition(pos);
  }, []);

  const handleRegenerate = () => {
    if (engineRef.current) {
      engineRef.current.regenerate();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyG') {
        setShowGemini(prev => !prev);
        setShowSettings(false);
        if (showGemini) document.body.requestPointerLock();
        else document.exitPointerLock();
      }
      
      if (e.code === 'KeyO' || e.code === 'Escape') {
        if (gameStarted) {
          setShowSettings(prev => !prev);
          setShowGemini(false);
          if (showSettings) document.body.requestPointerLock();
          else document.exitPointerLock();
        }
      }
      
      // Hotbar selection 1-9
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const types = Object.keys(BLOCK_DATA) as BlockType[];
        if (types[num - 1]) {
          setSelectedBlock(types[num - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGemini, showSettings, gameStarted]);

  const isMenuOpen = showGemini || showSettings;

  return (
    <div className="relative w-full h-full font-sans text-white select-none overflow-hidden bg-black">
      {/* Three.js Layer */}
      <VoxelEngine 
        active={gameStarted && !isMenuOpen}
        selectedBlock={selectedBlock}
        settings={worldSettings}
        onUpdate={handleEngineUpdate}
        ref={engineRef}
      />

      {/* Crosshair */}
      {!isMenuOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-5 h-5 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/70 shadow-sm"></div>
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/70 shadow-sm"></div>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-white/10">
        <h1 className="text-xl font-bold text-green-400 mb-2">VoxelCraft AI</h1>
        <div className="text-sm space-y-1 font-mono">
          <p>FPS: <span className="text-yellow-400">{stats.fps}</span></p>
          <p>POS: {Math.round(playerPosition.x)}, {Math.round(playerPosition.y)}, {Math.round(playerPosition.z)}</p>
          <p>BUILD: {stats.blocksPlaced} | BREAK: {stats.blocksBroken}</p>
          <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
             <p className="text-xs text-white/50">Press [G] for Gemini AI</p>
             <p className="text-xs text-white/50">Press [O] for Settings</p>
             <p className="text-xs text-white/50">Press [1-9] for Blocks</p>
          </div>
        </div>
      </div>

      {/* Bottom Interface */}
      {!isMenuOpen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
          <Hotbar selectedBlock={selectedBlock} onSelect={setSelectedBlock} />
        </div>
      )}

      {/* Start Screen */}
      {!gameStarted && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="text-center max-w-md p-10 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl">
            <div className="text-6xl mb-6">🧱</div>
            <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">VoxelCraft AI</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Step into a boundless world of blocks.
              Use Gemini AI to analyze your vision or generate new designs.
            </p>
            <button 
              onClick={handleStart}
              className="px-10 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
            >
              Start Adventure
            </button>
          </div>
        </div>
      )}

      {/* World Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          settings={worldSettings} 
          onUpdate={setWorldSettings} 
          onRegenerate={handleRegenerate}
          onClose={() => {
            setShowSettings(false);
            document.body.requestPointerLock();
          }} 
        />
      )}

      {/* Gemini AI Panel */}
      {showGemini && (
        <GeminiPanel onClose={() => {
          setShowGemini(false);
          document.body.requestPointerLock();
        }} />
      )}
    </div>
  );
};

export default App;
