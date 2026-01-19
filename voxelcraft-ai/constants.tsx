
import { BlockType, WorldSettings, BiomeType } from './types';

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 4;
export const GRAVITY = -24;
export const JUMP_FORCE = 8.5;
export const MOVE_SPEED = 5;
export const RUN_MULTIPLIER = 1.6;
export const MOUSE_SENSITIVITY = 0.002;

export const BLOCK_DATA: Record<BlockType, { top: number; side: number; bottom: number; name: string, icon: string }> = {
  grass: { top: 0x567d46, side: 0x8b4513, bottom: 0x8b4513, name: 'Grass', icon: '🌱' },
  dirt: { top: 0x8b4513, side: 0x8b4513, bottom: 0x8b4513, name: 'Dirt', icon: '🟫' },
  stone: { top: 0x808080, side: 0x808080, bottom: 0x808080, name: 'Stone', icon: '🪨' },
  wood: { top: 0x8b6914, side: 0x654321, bottom: 0x8b6914, name: 'Wood', icon: '🪵' },
  leaves: { top: 0x2d5a27, side: 0x2d5a27, bottom: 0x2d5a27, name: 'Leaves', icon: '🍃' },
  sand: { top: 0xe3c07d, side: 0xe3c07d, bottom: 0xe3c07d, name: 'Sand', icon: '🏖️' },
  water: { top: 0x1e90ff, side: 0x1e90ff, bottom: 0x1e90ff, name: 'Water', icon: '💧' },
  glowstone: { top: 0xffd700, side: 0xffd700, bottom: 0xffd700, name: 'Glowstone', icon: '✨' },
  bricks: { top: 0xa52a2a, side: 0xa52a2a, bottom: 0xa52a2a, name: 'Bricks', icon: '🧱' },
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  terrainHeight: 12,
  noiseFrequency: 0.1,
  noiseAmplitude: 4,
  biome: 'plains',
  renderDistance: 4,
};

export const BIOME_CONFIG: Record<BiomeType, { primary: BlockType, secondary: BlockType, background: number }> = {
  plains: { primary: 'grass', secondary: 'dirt', background: 0x87CEEB },
  mountains: { primary: 'stone', secondary: 'stone', background: 0x708090 },
  desert: { primary: 'sand', secondary: 'sand', background: 0xFFE4B5 },
  ocean: { primary: 'sand', secondary: 'dirt', background: 0x00008B },
};
