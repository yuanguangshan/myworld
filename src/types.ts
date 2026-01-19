export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface Block {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'leaves' | 'sand' | 'water';

export interface BlockColor {
  top: number;
  side: number;
  bottom: number;
}

export interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  velocity: { x: number; y: number; z: number };
  onGround: boolean;
}

export const BLOCK_COLORS: Record<BlockType, BlockColor> = {
  grass: { top: 0x7CFC00, side: 0x8B4513, bottom: 0x8B4513 },
  dirt: { top: 0x8B4513, side: 0x8B4513, bottom: 0x8B4513 },
  stone: { top: 0x808080, side: 0x808080, bottom: 0x808080 },
  wood: { top: 0x8B6914, side: 0x654321, bottom: 0x8B6914 },
  leaves: { top: 0x228B22, side: 0x228B22, bottom: 0x228B22 },
  sand: { top: 0xF4A460, side: 0xF4A460, bottom: 0xF4A460 },
  water: { top: 0x4169E1, side: 0x4169E1, bottom: 0x4169E1 },
};

export const BLOCK_NAMES: Record<BlockType, string> = {
  grass: '草地',
  dirt: '泥土',
  stone: '石头',
  wood: '木头',
  leaves: '树叶',
  sand: '沙子',
  water: '水',
};

export const WORLD_SIZE = 32;
export const CHUNK_SIZE = 16;
export const BLOCK_SIZE = 1;
export const GRAVITY = -30;
export const JUMP_FORCE = 10;
export const MOVE_SPEED = 5;
export const MOUSE_SENSITIVITY = 0.002;
