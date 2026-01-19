
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { BlockType, ChunkData, Block, GameStats, WorldSettings } from '../types';
import { CHUNK_SIZE, GRAVITY, JUMP_FORCE, MOVE_SPEED, RUN_MULTIPLIER, MOUSE_SENSITIVITY, BLOCK_DATA, BIOME_CONFIG } from '../constants';

interface VoxelEngineProps {
  active: boolean;
  selectedBlock: BlockType;
  settings: WorldSettings;
  onUpdate: (stats: GameStats, pos: { x: number, y: number, z: number }) => void;
}

export const VoxelEngine = forwardRef<any, VoxelEngineProps>(({ active, selectedBlock, settings, onUpdate }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    chunks: new Map<string, ChunkData>(),
    player: {
      position: new THREE.Vector3(0, 40, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Vector2(0, 0),
      onGround: false,
    },
    keys: new Set<string>(),
    stats: { blocksPlaced: 0, blocksBroken: 0, fps: 0 },
    lastTime: performance.now(),
    frameCount: 0,
    lastFpsUpdate: performance.now(),
    raycaster: new THREE.Raycaster(),
    currentSettings: settings,
  });

  const blockMaterials = useRef<Map<BlockType, THREE.Material[]>>(new Map());
  const blockGeometry = useRef(new THREE.BoxGeometry(1, 1, 1));

  useImperativeHandle(ref, () => ({
    regenerate: () => {
      const state = stateRef.current;
      // Clear existing chunks
      state.chunks.forEach(chunk => {
        if (chunk.group) state.scene?.remove(chunk.group);
      });
      state.chunks.clear();
      
      // Update scene background for biome
      const config = BIOME_CONFIG[settings.biome];
      // Fix: Explicitly check if background is a THREE.Color before calling .set()
      // to resolve the TypeScript error where background might be a Texture.
      if (state.scene?.background instanceof THREE.Color) {
        state.scene.background.set(config.background);
      } else if (state.scene) {
        state.scene.background = new THREE.Color(config.background);
      }
      
      if (state.scene?.fog) {
          (state.scene.fog as THREE.Fog).color.set(config.background);
      }
      
      // Reset player height
      state.player.position.y = settings.terrainHeight + settings.noiseAmplitude + 10;
      state.player.velocity.set(0, 0, 0);
      
      // Regenerate initial area
      updateChunks(state.player.position.x, state.player.position.z);
    }
  }));

  // Update local ref to settings for access in animate loop
  useEffect(() => {
    stateRef.current.currentSettings = settings;
  }, [settings]);

  useEffect(() => {
    const state = stateRef.current;
    
    // Setup materials
    Object.entries(BLOCK_DATA).forEach(([type, colors]) => {
      const mats = [
        new THREE.MeshLambertMaterial({ color: colors.side }),
        new THREE.MeshLambertMaterial({ color: colors.side }),
        new THREE.MeshLambertMaterial({ color: colors.top }),
        new THREE.MeshLambertMaterial({ color: colors.bottom }),
        new THREE.MeshLambertMaterial({ color: colors.side }),
        new THREE.MeshLambertMaterial({ color: colors.side }),
      ];
      blockMaterials.current.set(type as BlockType, mats);
    });

    // Scene setup
    state.scene = new THREE.Scene();
    const initialConfig = BIOME_CONFIG[settings.biome];
    state.scene.background = new THREE.Color(initialConfig.background);
    state.scene.fog = new THREE.Fog(initialConfig.background, 20, settings.renderDistance * CHUNK_SIZE * 1.5);

    state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.rotation.order = 'YXZ';

    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;
    containerRef.current?.appendChild(state.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(50, 100, 50);
    state.scene.add(sun);

    updateChunks(0, 0);

    const handleKeyDown = (e: KeyboardEvent) => state.keys.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => state.keys.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement && active) {
        state.player.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
        state.player.rotation.x -= e.movementY * MOUSE_SENSITIVITY;
        state.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.player.rotation.x));
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (!active || !document.pointerLockElement) return;
      handleInteract(e.button === 2);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    const animate = () => {
      const now = performance.now();
      const delta = Math.min((now - state.lastTime) / 1000, 0.1);
      state.lastTime = now;

      if (active) {
        updatePlayer(delta);
        updateChunks(state.player.position.x, state.player.position.z);
      }

      state.frameCount++;
      if (now - state.lastFpsUpdate >= 1000) {
        state.stats.fps = state.frameCount;
        state.frameCount = 0;
        state.lastFpsUpdate = now;
      }

      state.renderer?.render(state.scene!, state.camera!);
      onUpdate(state.stats, { x: state.player.position.x, y: state.player.position.y, z: state.player.position.z });
      
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      state.renderer?.dispose();
    };
  }, []);

  const updatePlayer = (delta: number) => {
    const state = stateRef.current;
    if (!state.camera) return;

    state.player.velocity.y += GRAVITY * delta;
    
    const direction = new THREE.Vector3();
    if (state.keys.has('KeyW')) direction.z -= 1;
    if (state.keys.has('KeyS')) direction.z += 1;
    if (state.keys.has('KeyA')) direction.x -= 1;
    if (state.keys.has('KeyD')) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.player.rotation.y);
      const isRunning = state.keys.has('ShiftLeft');
      const speed = MOVE_SPEED * (isRunning ? RUN_MULTIPLIER : 1);
      state.player.velocity.x = direction.x * speed;
      state.player.velocity.z = direction.z * speed;
    } else {
      state.player.velocity.x = 0;
      state.player.velocity.z = 0;
    }

    if (state.keys.has('Space') && state.player.onGround) {
      state.player.velocity.y = JUMP_FORCE;
      state.player.onGround = false;
    }

    const nextPos = state.player.position.clone().add(state.player.velocity.clone().multiplyScalar(delta));
    
    // Simple block collision
    const bx = Math.floor(nextPos.x);
    const by = Math.floor(nextPos.y);
    const bz = Math.floor(nextPos.z);
    
    if (getBlockAt(bx, by, bz)) {
      state.player.velocity.y = 0;
      state.player.onGround = true;
      nextPos.y = Math.ceil(nextPos.y);
    } else {
      state.player.onGround = false;
    }

    state.player.position.copy(nextPos);
    
    state.camera.position.set(state.player.position.x, state.player.position.y + 1.6, state.player.position.z);
    state.camera.rotation.y = state.player.rotation.y;
    state.camera.rotation.x = state.player.rotation.x;
  };

  const getBlockAt = (x: number, y: number, z: number): Block | null => {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = stateRef.current.chunks.get(`${cx},${cz}`);
    if (!chunk) return null;
    return chunk.blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) || null;
  };

  const updateChunks = (px: number, pz: number) => {
    const state = stateRef.current;
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const dist = state.currentSettings.renderDistance;

    for (let x = -dist; x <= dist; x++) {
      for (let z = -dist; z <= dist; z++) {
        const cx = pcx + x;
        const cz = pcz + z;
        const key = `${cx},${cz}`;
        if (!state.chunks.has(key)) {
          generateChunk(cx, cz);
        }
      }
    }
  };

  const generateChunk = (cx: number, cz: number) => {
    const state = stateRef.current;
    const chunkSettings = state.currentSettings;
    const biome = BIOME_CONFIG[chunkSettings.biome];
    
    const chunk: ChunkData = {
      blocks: new Map(),
      position: { x: cx * CHUNK_SIZE, z: cz * CHUNK_SIZE },
      group: new THREE.Group()
    };

    const instancedMeshes = new Map<BlockType, { matrices: THREE.Matrix4[], count: number }>();

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        
        // Multi-frequency noise approximation
        const f = chunkSettings.noiseFrequency;
        const a = chunkSettings.noiseAmplitude;
        const height = Math.floor(
          Math.sin(wx * f) * a + 
          Math.cos(wz * f) * a + 
          Math.sin(wx * f * 2) * (a / 2) + 
          chunkSettings.terrainHeight
        );
        
        for (let y = 0; y <= height; y++) {
          let type: BlockType = 'stone';
          if (y === height) type = biome.primary;
          else if (y > height - 3) type = biome.secondary;

          chunk.blocks.set(`${wx},${y},${wz}`, { x: wx, y, z: wz, type });
          
          if (!instancedMeshes.has(type)) instancedMeshes.set(type, { matrices: [], count: 0 });
          const data = instancedMeshes.get(type)!;
          data.matrices.push(new THREE.Matrix4().makeTranslation(wx, y, wz));
          data.count++;
        }
      }
    }

    instancedMeshes.forEach((data, type) => {
      const mesh = new THREE.InstancedMesh(blockGeometry.current, blockMaterials.current.get(type)!, data.count);
      data.matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group?.add(mesh);
    });

    state.scene?.add(chunk.group!);
    state.chunks.set(`${cx},${cz}`, chunk);
  };

  const handleInteract = (isPlacing: boolean) => {
    const state = stateRef.current;
    if (!state.camera) return;

    state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    state.raycaster.far = 6;
    
    const allMeshes: THREE.Object3D[] = [];
    state.chunks.forEach(c => allMeshes.push(...c.group!.children));

    const intersects = state.raycaster.intersectObjects(allMeshes);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const instanceId = hit.instanceId;
      if (instanceId === undefined) return;

      const mesh = hit.object as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(instanceId, matrix);
      const pos = new THREE.Vector3().setFromMatrixPosition(matrix);

      const targetX = Math.round(pos.x);
      const targetY = Math.round(pos.y);
      const targetZ = Math.round(pos.z);

      if (isPlacing) {
        const face = hit.face?.normal || new THREE.Vector3();
        const nx = targetX + Math.round(face.x);
        const ny = targetY + Math.round(face.y);
        const nz = targetZ + Math.round(face.z);
        addBlock(nx, ny, nz, selectedBlock);
      } else {
        removeBlock(targetX, targetY, targetZ);
      }
    }
  };

  const addBlock = (x: number, y: number, z: number, type: BlockType) => {
    const state = stateRef.current;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = state.chunks.get(`${cx},${cz}`);
    if (chunk) {
      chunk.blocks.set(`${x},${y},${z}`, { x, y, z, type });
      rebuildChunkMesh(cx, cz);
      state.stats.blocksPlaced++;
    }
  };

  const removeBlock = (x: number, y: number, z: number) => {
    const state = stateRef.current;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = state.chunks.get(`${cx},${cz}`);
    if (chunk) {
      chunk.blocks.delete(`${x},${y},${z}`);
      rebuildChunkMesh(cx, cz);
      state.stats.blocksBroken++;
    }
  };

  const rebuildChunkMesh = (cx: number, cz: number) => {
    const state = stateRef.current;
    const chunk = state.chunks.get(`${cx},${cz}`);
    if (!chunk) return;

    state.scene?.remove(chunk.group!);
    chunk.group = new THREE.Group();

    const instancedMeshes = new Map<BlockType, { matrices: THREE.Matrix4[], count: number }>();
    chunk.blocks.forEach(b => {
      if (!instancedMeshes.has(b.type)) instancedMeshes.set(b.type, { matrices: [], count: 0 });
      const data = instancedMeshes.get(b.type)!;
      data.matrices.push(new THREE.Matrix4().makeTranslation(b.x, b.y, b.z));
      data.count++;
    });

    instancedMeshes.forEach((data, type) => {
      const mesh = new THREE.InstancedMesh(blockGeometry.current, blockMaterials.current.get(type)!, data.count);
      data.matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group?.add(mesh);
    });

    state.scene?.add(chunk.group!);
  };

  return <div ref={containerRef} className="w-full h-full" />;
});
