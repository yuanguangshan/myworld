import * as THREE from 'three';
import { BLOCK_COLORS, Block, BlockType, Vector3Like, WorldStats, WORLD_SIZE } from './types';

export interface ChunkKey {
  x: number;
  z: number;
}

export interface ChunkData {
  blocks: Map<string, Block>;
  mesh?: THREE.InstancedMesh;
  position: { x: number; z: number };
}

export class ChunkManager {
  private scene: THREE.Scene;
  private chunks: Map<string, ChunkData>;
  private blockGeometries: Map<BlockType, THREE.BoxGeometry>;
  private blockMaterials: Map<BlockType, THREE.Material[]>;
  private lastChunkX: number = 0;
  private lastChunkZ: number = 0;
  private geometry: THREE.BoxGeometry;
  private worldStats: WorldStats = {
    blocksPlaced: 0,
    blocksBroken: 0,
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.createMaterials();
    this.createBlockGeometries();
    this.generateInitialWorld();
  }

  private createMaterials() {
    this.blockMaterials = new Map();

    for (const [blockType, colors] of Object.entries(BLOCK_COLORS)) {
      const materials = [
        new THREE.MeshLambertMaterial({ color: colors.side }),
        new THREE.MeshLambertMaterial({ color: colors.side }),
        new THREE.MeshLambertMaterial({ color: colors.top }),
        new THREE.MeshLambertMaterial({ color: colors.bottom }),
        new THREE.MeshLambertMaterial({ color: colors.side }),
        new THREE.MeshLambertMaterial({ color: colors.side }),
      ];
      this.blockMaterials.set(blockType as BlockType, materials);
    }
  }

  private createBlockGeometries() {
    this.blockGeometries = new Map();

    const blockTypes: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'sand'];

    for (const type of blockTypes) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      this.blockGeometries.set(type, geo);
    }
  }

  private getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  getChunkData(worldX: number, worldZ: number): ChunkData | null {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);
    const key = this.getChunkKey(cx, cz);

    if (!this.chunks.has(key)) {
      return null;
    }

    return this.chunks.get(key) || null;
  }

  addBlock(x: number, y: number, z: number, type: BlockType) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = this.getChunkKey(cx, cz);

    let chunkData = this.chunks.get(key);

    if (!chunkData) {
      chunkData = {
        blocks: new Map(),
        position: { x: cx * CHUNK_SIZE, z: cz * CHUNK_SIZE },
      };
      this.chunks.set(key, chunkData);
    }

    const blockKey = `${x},${y},${z}`;
    chunkData.blocks.set(blockKey, { x, y, z, type });
    this.worldStats.blocksPlaced++;

    this.rebuildChunkMesh(cx, cz);
    this.updateNeighborChunks(cx, cz);
  }

  removeBlock(x: number, y: number, z: number): boolean {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = this.getChunkKey(cx, cz);
    const blockKey = `${x},${y},${z}`;

    const chunkData = this.chunks.get(key);

    if (!chunkData || !chunkData.blocks.has(blockKey)) {
      return false;
    }

    chunkData.blocks.delete(blockKey);
    this.worldStats.blocksBroken++;

    this.rebuildChunkMesh(cx, cz);
    this.updateNeighborChunks(cx, cz);

    return true;
  }

  private rebuildChunkMesh(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    const chunkData = this.chunks.get(key);

    if (!chunkData) {
      return;
    }

    if (chunkData.mesh) {
      this.scene.remove(chunkData.mesh);
    }

    const instancesByType = new Map<BlockType, { count: number; matrices: THREE.Matrix4[] }>();

    for (const [_, block] of chunkData.blocks) {
      if (!instancesByType.has(block.type)) {
        instancesByType.set(block.type, { count: 0, matrices: [] });
      }

      const instanceData = instancesByType.get(block.type)!;
      instanceData.count++;
      instanceData.matrices.push(new THREE.Matrix4().makeTranslation(block.x, block.y, block.z));
    }

    const group = new THREE.Group();

    for (const [blockType, data] of instancesByType) {
      if (data.count === 0) continue;

      const geometry = this.blockGeometries.get(blockType);
      const materials = this.blockMaterials.get(blockType);

      if (!geometry || !materials) continue;

      const instancedMesh = new THREE.InstancedMesh(geometry, materials, data.count);

      for (let i = 0; i < data.count; i++) {
        instancedMesh.setMatrixAt(i, data.matrices[i]);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      group.add(instancedMesh);
    }

    this.scene.add(group);
    chunkData.mesh = group as any;
  }

  private updateNeighborChunks(cx: number, cz: number) {
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];

    for (const [dx, dz] of directions) {
      const neighborKey = this.getChunkKey(cx + dx, cz + dz);

      if (this.chunks.has(neighborKey)) {
        this.rebuildChunkMesh(cx + dx, cz + dz);
      }
    }
  }

  private generateChunk(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    const chunkData: ChunkData = {
      blocks: new Map(),
      position: { x: cx * CHUNK_SIZE, z: cz * CHUNK_SIZE },
    };

    const offsetX = cx * CHUNK_SIZE;
    const offsetZ = cz * CHUNK_SIZE;

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = offsetX + x;
        const wz = offsetZ + z;

        const height = Math.floor(
          Math.sin(wx * 0.05) * 3 +
            Math.cos(wz * 0.05) * 3 +
            Math.sin(wx * 0.03 + wz * 0.03) * 5 + 5
        );

        for (let y = 0; y <= height; y++) {
          let blockType: BlockType;

          if (y === height) {
            blockType = 'grass';
          } else if (y > height - 3) {
            blockType = 'dirt';
          } else {
            blockType = 'stone';
          }

          chunkData.blocks.set(`${wx},${y},${wz}`, { x: wx, y, z: wz, type: blockType });
        }

        if (x % 8 === 0 && z % 8 === 0 && Math.random() > 0.7) {
          this.generateTree(chunkData, wx, height + 1, wz);
        }
      }
    }

    this.chunks.set(key, chunkData);
    this.rebuildChunkMesh(cx, cz);
  }

  private generateTree(chunkData: ChunkData, x: number, y: number, z: number) {
    for (let i = 0; i < 4; i++) {
      chunkData.blocks.set(`${x},${y + i},${z}`, { x, y: y + i, z, type: 'wood' });
    }

    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 2; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (dy === 2 && (Math.abs(dx) > 1 || Math.abs(dz) > 1)) continue;
          if (dx === 0 && dz === 0 && dy < 2) continue;

          chunkData.blocks.set(`${x + dx},${y + 4 + dy},${z + dz}`, {
            x: x + dx,
            y: y + 4 + dy,
            z: z + dz,
            type: 'leaves',
          });
        }
      }
    }
  }

  getBlockAt(x: number, y: number, z: number): Block | null {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = this.getChunkKey(cx, cz);

    const chunkData = this.chunks.get(key);

    if (!chunkData) {
      return null;
    }

    const blockKey = `${x},${y},${z}`;
    return chunkData.blocks.get(blockKey) || null;
  }

  getRaycastTarget(camera: THREE.Camera, raycaster: THREE.Raycaster): { block: Block; face: THREE.Vector3 } | null {
    const allMeshes: THREE.InstancedMesh[] = [];

    for (const [_, chunk] of this.chunks) {
      if (chunk.mesh) {
        allMeshes.push(...chunk.mesh.children as THREE.InstancedMesh[]);
      }
    }

    const intersects = raycaster.intersectObjects(allMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const matrix = new THREE.Matrix4();

      const instancedMesh = hit.object as THREE.InstancedMesh;
      const instanceId = hit.instanceId || 0;
      instancedMesh.getMatrixAt(instanceId, matrix);

      const position = new THREE.Vector3();
      position.setFromMatrixPosition(matrix);

      const chunkData = this.getChunkData(position.x, position.z);

      if (chunkData) {
        const blockKey = `${Math.round(position.x)},${Math.round(position.y)},${Math.round(position.z)}`;
        const actualBlock = chunkData.blocks.get(blockKey);
        if (actualBlock) {
          return {
            block: {
              x: Math.round(position.x),
              y: Math.round(position.y),
              z: Math.round(position.z),
              type: actualBlock.type,
            },
            face: hit.face.normal,
          };
        }
      }

      return null;
    }

  update(playerPosition: { x: number; z: number }) {
    const cx = Math.floor(playerPosition.x / CHUNK_SIZE);
    const cz = Math.floor(playerPosition.z / CHUNK_SIZE);

    if (cx !== this.lastChunkX || cz !== this.lastChunkZ) {
      this.lastChunkX = cx;
      this.lastChunkZ = cz;

      const renderDist = 3;

      for (let dx = -renderDist; dx <= renderDist; dx++) {
        for (let dz = -renderDist; dz <= renderDist; dz++) {
          const key = this.getChunkKey(cx + dx, cz + dz);

          if (!this.chunks.has(key)) {
            this.generateChunk(cx + dx, cz + dz);
          }
        }
      }

      const keysToDelete: string[] = [];

      this.chunks.forEach((chunk, key) => {
        const [kx, kz] = key.split(',').map(Number);
        const dist = Math.max(Math.abs(kx - cx), Math.abs(kz - cz));

        if (dist > renderDist + 1) {
          keysToDelete.push(key);
        }
      });

      for (const key of keysToDelete) {
        const chunk = this.chunks.get(key);

        if (chunk && chunk.mesh) {
          this.scene.remove(chunk.mesh);
        }

        this.chunks.delete(key);
      }
    }
  }

  getStats(): WorldStats {
    return { ...this.worldStats };
  }

  dispose() {
    this.blockMaterials.forEach((materials) => {
      materials.forEach((material) => material.dispose());
    });

    this.blockGeometries.forEach((geometry) => {
      geometry.dispose();
    });

    this.geometry.dispose();

    for (const [_, chunk] of this.chunks) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
      }
    }

    this.chunks.clear();
  }
}
