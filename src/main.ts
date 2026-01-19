import * as THREE from 'three';
import { World } from './world';
import { Player } from './player';
import { BLOCK_NAMES, BlockType } from './types';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private player: Player;
  private raycaster: THREE.Raycaster;
  private selectedBlock: BlockType = 'grass';
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private selectedSlot: number = 0;
  private blockTypes: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'sand'];

  constructor() {
    this.init();
    this.setupUI();
    this.animate();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);

    this.world = new World(this.scene);

    this.player = new Player(this.camera, { x: 0, y: 15, z: 0 });

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 6;

    window.addEventListener('resize', () => this.onWindowResize());
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('wheel', (e) => this.onMouseWheel(e));
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  private setupUI() {
    const selector = document.getElementById('block-selector');
    if (selector) {
      selector.innerHTML = '';
      this.blockTypes.forEach((type, index) => {
        const slot = document.createElement('div');
        slot.className = 'block-slot' + (index === 0 ? ' selected' : '');
        slot.dataset.block = type;
        slot.innerHTML = `<span style="color: ${
          type === 'grass' ? '#7CFC00' :
          type === 'dirt' ? '#8B4513' :
          type === 'stone' ? '#808080' :
          type === 'wood' ? '#8B6914' :
          type === 'leaves' ? '#228B22' :
          type === 'sand' ? '#F4A460' : '#FFFFFF'
        };">${index + 1}</span>`;
        slot.title = BLOCK_NAMES[type];
        slot.addEventListener('click', () => this.selectBlock(index));
        selector.appendChild(slot);
      });
    }

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

  private selectBlock(index: number) {
    this.selectedSlot = index;
    this.selectedBlock = this.blockTypes[index];

    const slots = document.querySelectorAll('.block-slot');
    slots.forEach((slot, i) => {
      slot.classList.toggle('selected', i === index);
    });
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.isRunning) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const target = this.world.getRaycastTarget(this.camera, this.raycaster);

    if (target) {
      const { block, face } = target;

      if (e.button === 0) {
        this.world.removeBlock(block.x, block.y, block.z);
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
          this.world.addBlock(newX, newY, newZ, this.selectedBlock);
        }
      }
    }
  }

  private onMouseWheel(e: WheelEvent) {
    if (!this.isRunning) return;

    const delta = Math.sign(e.deltaY);
    let newIndex = this.selectedSlot + delta;

    if (newIndex < 0) newIndex = this.blockTypes.length - 1;
    if (newIndex >= this.blockTypes.length) newIndex = 0;

    this.selectBlock(newIndex);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.isRunning) return;

    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= this.blockTypes.length) {
      this.selectBlock(keyNum - 1);
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
    const posElement = document.getElementById('position');
    if (posElement) {
      posElement.textContent = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.isRunning) {
      this.player.update(delta, this.world);
    }

    this.renderer.render(this.scene, this.camera);
    this.updateUI(delta);
  }
}

new Game();
