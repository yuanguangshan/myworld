import * as THREE from 'three';
import { BlockType, WORLD_SIZE, BLOCK_COLORS, WorldStats } from './types';

interface ChunkData {
  blocks: Map<string, { type: BlockType; position: THREE.Vector3 }>;
  mesh: THREE.Group;
  blockGeometries: Map<BlockType, THREE.InstancedMesh>;
}

export class Game {
  private chunks: Map<string, ChunkData> = new Map();
  private scene: THREE.Scene;
  private renderDistance: number = 3;
  private stats: WorldStats = {
    blocksPlaced: 0,
    blocksBroken: 0
  };
  private raycastMeshes: THREE.InstancedMesh[] = []; // 用于raycast的缓存

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private getChunkKey(x: number, z: number): string {
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    return `${chunkX},${chunkZ}`;
  }

  private getBlockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private getBlockAt(x: number, y: number, z: number): BlockType | null {
    const chunkKey = this.getChunkKey(x, z);
    const chunk = this.chunks.get(chunkKey);
    
    if (!chunk) return null;
    
    const blockKey = this.getBlockKey(x, y, z);
    const block = chunk.blocks.get(blockKey);
    
    return block ? block.type : null;
  }

  private getOrCreateChunk(chunkX: number, chunkZ: number): ChunkData {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.chunks.has(chunkKey)) {
      return this.chunks.get(chunkKey)!;
    }
    
    const chunk: ChunkData = {
      blocks: new Map(),
      mesh: new THREE.Group(),
      blockGeometries: new Map()
    };
    
    this.chunks.set(chunkKey, chunk);
    this.scene.add(chunk.mesh);
    
    return chunk;
  }

  private rebuildChunkMesh(chunk: ChunkData) {
    // 清除现有的instanced meshes
    chunk.mesh.clear();

    // 从raycastMeshes中移除旧的mesh
    for (const mesh of chunk.blockGeometries.values()) {
      const index = this.raycastMeshes.indexOf(mesh);
      if (index !== -1) {
        this.raycastMeshes.splice(index, 1);
      }
      mesh.removeFromParent();
    }
    chunk.blockGeometries.clear();

    // 按block type分组
    const blocksByType: Record<BlockType, Array<{x: number, y: number, z: number}>> = {
      grass: [],
      dirt: [],
      stone: [],
      wood: [],
      leaves: [],
      sand: [],
      water: []
    };

    chunk.blocks.forEach((block, key) => {
      const [x, y, z] = key.split(',').map(Number);
      blocksByType[block.type].push({x, y, z});
    });

    // 为每种block type创建instanced mesh
    Object.entries(blocksByType).forEach(([type, positions]) => {
      if (positions.length === 0) return;

      const blockType = type as BlockType;
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({
        color: BLOCK_COLORS[blockType].side,
        vertexColors: true
      });

      const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 优化更新

      positions.forEach((pos, index) => {
        const matrix = new THREE.Matrix4();
        matrix.setPosition(pos.x, pos.y, pos.z);
        instancedMesh.setMatrixAt(index, matrix);
      });

      instancedMesh.count = positions.length;
      instancedMesh.instanceMatrix.needsUpdate = true;

      chunk.blockGeometries.set(blockType, instancedMesh);
      chunk.mesh.add(instancedMesh);
      this.raycastMeshes.push(instancedMesh); // 添加到raycast缓存

      geometry.dispose(); // 立即释放临时几何体
    });
  }

  addBlock(x: number, y: number, z: number, type: BlockType) {
    const chunk = this.getOrCreateChunk(Math.floor(x / 16), Math.floor(z / 16));
    
    const blockKey = this.getBlockKey(x, y, z);
    if (!chunk.blocks.has(blockKey)) {
      chunk.blocks.set(blockKey, { type, position: new THREE.Vector3(x, y, z) });
      this.rebuildChunkMesh(chunk);
      this.stats.blocksPlaced++;
    }
  }

  removeBlock(x: number, y: number, z: number) {
    const chunkKey = this.getChunkKey(x, z);
    const chunk = this.chunks.get(chunkKey);
    
    if (!chunk) return;
    
    const blockKey = this.getBlockKey(x, y, z);
    if (chunk.blocks.has(blockKey)) {
      chunk.blocks.delete(blockKey);
      this.rebuildChunkMesh(chunk);
      this.stats.blocksBroken++;
    }
  }

  getRaycastTarget(raycaster: THREE.Raycaster) {
    // 使用缓存的mesh进行raycasting，提高性能
    const intersects = raycaster.intersectObjects(this.raycastMeshes, true);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      // 计算被击中的方块坐标
      // 通过交点位置近似计算方块坐标
      const blockX = Math.floor(intersect.point.x);
      const blockY = Math.floor(intersect.point.y);
      const blockZ = Math.floor(intersect.point.z);

      // 使用射线方向而不是面法线来确定放置方向
      // 这解决了AI提到的InstancedMesh face.normal不可靠的问题
      const normal = raycaster.ray.direction.clone().multiplyScalar(-1).round();

      return {
        block: { x: blockX, y: blockY, z: blockZ },
        face: normal
      };
    }

    return null;
  }

  update(playerPosition: { x: number; z: number }) {
    // 根据玩家位置更新可见区块
    const playerChunkX = Math.floor(playerPosition.x / 16);
    const playerChunkZ = Math.floor(playerPosition.z / 16);

    // 添加需要的区块
    for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
      for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
        const chunkKey = `${x},${z}`;
        if (!this.chunks.has(chunkKey)) {
          this.getOrCreateChunk(x, z);
          
          // 为新区块生成一些示例地形
          this.generateTerrain(x, z);
        }
      }
    }

    // 移除不需要的区块
    for (const [chunkKey, chunk] of this.chunks) {
      const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
      const distance = Math.max(
        Math.abs(chunkX - playerChunkX),
        Math.abs(chunkZ - playerChunkZ)
      );
      
      if (distance > this.renderDistance + 1) {
        // 从场景中移除
        this.scene.remove(chunk.mesh);
        
        // 清理内存
        chunk.blockGeometries.forEach(mesh => {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
        
        // 从chunks map中删除
        this.chunks.delete(chunkKey);
      }
    }
  }

  private generateTerrain(chunkX: number, chunkZ: number) {
    const chunk = this.getOrCreateChunk(chunkX, chunkZ);
    
    // 生成简单的地形
    for (let x = chunkX * 16; x < (chunkX + 1) * 16; x++) {
      for (let z = chunkZ * 16; z < (chunkZ + 1) * 16; z++) {
        // 地面高度（简单噪声）
        const height = Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3 + 5);
        
        // 放置地面层
        this.addBlock(x, height, z, 'grass');
        for (let y = height - 1; y > height - 4; y--) {
          if (y >= 0) this.addBlock(x, y, z, 'dirt');
        }
        
        // 放置基岩层
        this.addBlock(x, 0, z, 'stone');
      }
    }
  }

  getStats(): WorldStats {
    return { ...this.stats };
  }

  dispose() {
    // 清理所有资源
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.mesh);

      chunk.blockGeometries.forEach(mesh => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    }

    // 清理raycast mesh缓存
    this.raycastMeshes = [];

    this.chunks.clear();
  }
}