import * as THREE from 'three';
import { BLOCK_COLORS, Block, BlockType, Vector3Like } from './types';

export class World {
  private scene: THREE.Scene;
  private blocks: Map<string, Block>;
  private blockMeshes: Map<string, THREE.Mesh>;
  private geometry: THREE.BoxGeometry;
  private materials: Map<BlockType, THREE.Material[]>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.blockMeshes = new Map();

    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = new Map();
    this.createMaterials();
    this.generateTerrain();
  }

  private createMaterials() {
    for (const [blockType, colors] of Object.entries(BLOCK_COLORS)) {
      const materials = [
        new THREE.MeshLambertMaterial({ color: colors.side }),   // right
        new THREE.MeshLambertMaterial({ color: colors.side }),   // left
        new THREE.MeshLambertMaterial({ color: colors.top }),    // top
        new THREE.MeshLambertMaterial({ color: colors.bottom }), // bottom
        new THREE.MeshLambertMaterial({ color: colors.side }),   // front
        new THREE.MeshLambertMaterial({ color: colors.side }),   // back
      ];
      this.materials.set(blockType as BlockType, materials);
    }
  }

  private generateTerrain() {
    const size = 32;
    const halfSize = size / 2;

    for (let x = -halfSize; x < halfSize; x++) {
      for (let z = -halfSize; z < halfSize; z++) {
        const height = Math.floor(
          Math.sin(x * 0.1) * 3 +
          Math.cos(z * 0.1) * 3 +
          Math.sin(x * 0.05 + z * 0.05) * 5 + 5
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

          this.addBlock(x, y, z, blockType);
        }

        if (x % 8 === 0 && z % 8 === 0 && Math.random() > 0.5) {
          this.generateTree(x, height + 1, z);
        }
      }
    }
  }

  private generateTree(x: number, y: number, z: number) {
    for (let i = 0; i < 4; i++) {
      this.addBlock(x, y + i, z, 'wood');
    }

    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 2; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (dy === 2 && (Math.abs(dx) > 1 || Math.abs(dz) > 1)) continue;
          if (dx === 0 && dz === 0 && dy < 2) continue;

          this.addBlock(x + dx, y + 4 + dy, z + dz, 'leaves');
        }
      }
    }
  }

  private getBlockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  addBlock(x: number, y: number, z: number, type: BlockType) {
    const key = this.getBlockKey(x, y, z);

    if (this.blocks.has(key)) {
      return;
    }

    const block: Block = { x, y, z, type };
    this.blocks.set(key, block);

    if (this.isBlockVisible(x, y, z)) {
      this.createBlockMesh(block);
    }
  }

  removeBlock(x: number, y: number, z: number): boolean {
    const key = this.getBlockKey(x, y, z);

    if (!this.blocks.has(key)) {
      return false;
    }

    this.blocks.delete(key);

    const mesh = this.blockMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      this.blockMeshes.delete(key);
    }

    this.updateNeighborBlocks(x, y, z);

    return true;
  }

  private createBlockMesh(block: Block) {
    const materials = this.materials.get(block.type);
    if (!materials) return;

    const mesh = new THREE.Mesh(this.geometry, materials);
    mesh.position.set(block.x, block.y, block.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    this.scene.add(mesh);
    this.blockMeshes.set(this.getBlockKey(block.x, block.y, block.z), mesh);
  }

  private isBlockVisible(x: number, y: number, z: number): boolean {
    const directions = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];

    for (const [dx, dy, dz] of directions) {
      const neighborKey = this.getBlockKey(x + dx, y + dy, z + dz);
      if (!this.blocks.has(neighborKey)) {
        return true;
      }
    }

    return false;
  }

  private updateNeighborBlocks(x: number, y: number, z: number) {
    const directions = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];

    for (const [dx, dy, dz] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      const neighborKey = this.getBlockKey(nx, ny, nz);

      const block = this.blocks.get(neighborKey);
      if (block) {
        const key = this.getBlockKey(block.x, block.y, block.z);
        const mesh = this.blockMeshes.get(key);

        if (mesh) {
          this.scene.remove(mesh);
          this.blockMeshes.delete(key);
        }

        if (this.isBlockVisible(nx, ny, nz)) {
          this.createBlockMesh(block);
        }
      }
    }
  }

  getBlockAt(x: number, y: number, z: number): Block | null {
    const key = this.getBlockKey(x, y, z);
    return this.blocks.get(key) || null;
  }

  getRaycastTarget(camera: THREE.Camera, raycaster: THREE.Raycaster): { block: Block; face: THREE.Vector3 } | null {
    const meshes = Array.from(this.blockMeshes.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const position = mesh.position;

      const block = {
        x: Math.round(position.x),
        y: Math.round(position.y),
        z: Math.round(position.z),
        type: this.blocks.get(this.getBlockKey(
          Math.round(position.x),
          Math.round(position.y),
          Math.round(position.z)
        ))?.type || 'grass',
      };

      return {
        block,
        face: hit.face.normal,
      };
    }

    return null;
  }

  dispose() {
    this.materials.forEach((materials) => {
      materials.forEach((material) => material.dispose());
    });

    this.geometry.dispose();

    this.blockMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });

    this.blocks.clear();
    this.blockMeshes.clear();
  }
}
