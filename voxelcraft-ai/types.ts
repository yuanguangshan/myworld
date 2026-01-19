
import * as THREE from 'three';

export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'leaves' | 'sand' | 'water' | 'glowstone' | 'bricks';

export interface Block {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export interface ChunkData {
  blocks: Map<string, Block>;
  group?: THREE.Group;
  position: { x: number; z: number };
}

export interface PlayerState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  onGround: boolean;
}

export interface GameStats {
  blocksPlaced: number;
  blocksBroken: number;
  fps: number;
}

export interface GeminiResponse {
  text?: string;
  imageUrl?: string;
  error?: string;
}

export type BiomeType = 'plains' | 'mountains' | 'desert' | 'ocean';

export interface WorldSettings {
  terrainHeight: number;
  noiseFrequency: number;
  noiseAmplitude: number;
  biome: BiomeType;
  renderDistance: number;
}
