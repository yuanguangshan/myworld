import * as THREE from 'three';
import { Game as Game } from './chunkManager';
import { Player } from './player';
import { BLOCK_NAMES, BlockType, WORLD_SIZE, WorldStats } from './types';

export class MyWorldGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private chunkManager: Game;
  private player: Player;
  private raycaster: THREE.Raycaster;
  private selectedBlock: BlockType = 'grass';
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private stats: WorldStats = {
    blocksPlaced: 0,
    blocksBroken: 0
  };

  constructor() {
    this.init();
    this.setupUI();
    this.animate();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, WORLD_SIZE * 2);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -WORLD_SIZE;
    directionalLight.shadow.camera.right = WORLD_SIZE;
    directionalLight.shadow.camera.top = WORLD_SIZE;
    directionalLight.shadow.camera.bottom = -WORLD_SIZE;
    this.scene.add(directionalLight);

    this.chunkManager = new Game(this.scene);

    this.player = new Player(this.camera, { x: 0, y: 50, z: 0 });

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 6;

    window.addEventListener('resize', () => this.onWindowResize());
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  private setupUI() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.style.display = 'none';
        this.isRunning = true;
        document.body.requestPointerLock();
      });
    }
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.isRunning) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const target = this.chunkManager.getRaycastTarget(this.raycaster);

    if (target) {
      const { block, face } = target;

      if (e.button === 0) {
        this.chunkManager.removeBlock(block.x, block.y, block.z);
      } else if (e.button === 2) {
        const newX = block.x + Math.round(face.x);
        const newY = block.y + Math.round(face.y);
        const newZ = block.z + Math.round(face.z);

        const playerPos = this.player.getPosition();
        const distance = Math.sqrt(
          Math.pow(newX - playerPos.x, 2) +
          Math.pow(newY - (playerPos.y + 0.9), 2) +
          Math.pow(newZ - playerPos.z, 2)
        );

        if (distance > 1.5) {
          this.chunkManager.addBlock(newX, newY, newZ, this.selectedBlock);
        }
      }
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateUI(delta: number) {
    this.frameCount++;

    if (performance.now() - this.lastFpsUpdate >= 1000) {
      const fps = this.frameCount;
      const fpsElement = document.getElementById('fps');
      if (fpsElement) fpsElement.textContent = fps.toString();

      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();
    }

    const pos = this.player.getPosition();
    const stats = this.chunkManager.getStats();
    const posElement = document.getElementById('position');
    if (posElement) {
      posElement.textContent = `X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`;
    }

    const statsElement = document.getElementById('stats');
    if (statsElement) {
      statsElement.innerHTML = `Placed: ${stats.blocksPlaced} | Broken: ${stats.blocksBroken}`;
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.isRunning) {
      this.player.update(delta, this.chunkManager);
      const { x, z } = this.player.getPosition();
      this.chunkManager.update({ x, z });
    }

    this.renderer.render(this.scene, this.camera);
    this.updateUI(delta);
  }
}

new MyWorldGame();
