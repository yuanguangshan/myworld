import * as THREE from 'three';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, MOUSE_SENSITIVITY, PlayerState, RUN_MULTIPLIER } from './types';

export class Player {
  private camera: THREE.PerspectiveCamera;
  private state: PlayerState;
  private keys: Map<string, boolean>;
  private isLocked: boolean;

  constructor(camera: THREE.PerspectiveCamera, startPosition = { x: 0, y: 10, z: 0 }) {
    this.camera = camera;
    this.keys = new Map();
    this.isLocked = false;

    this.state = {
      position: { ...startPosition },
      rotation: { x: 0, y: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      onGround: false,
    };

    this.setupEventListeners();
    this.updateCamera();
  }

  private setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);

      if (e.code === 'Space' && this.state.onGround) {
        this.state.velocity.y = JUMP_FORCE;
        this.state.onGround = false;
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isLocked) {
        this.state.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
        this.state.rotation.x -= e.movementY * MOUSE_SENSITIVITY;

        this.state.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.state.rotation.x));

        this.updateCamera();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === document.body;
    });

    document.addEventListener('click', () => {
      if (!this.isLocked) {
        document.body.requestPointerLock();
      }
    });
  }

  private updateCamera() {
    this.camera.position.set(
      this.state.position.x,
      this.state.position.y + 1.6,
      this.state.position.z
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.state.rotation.y;
    this.camera.rotation.x = this.state.rotation.x;
  }

  getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();

    if (this.keys.get('KeyW')) direction.z -= 1;
    if (this.keys.get('KeyS')) direction.z += 1;
    if (this.keys.get('KeyA')) direction.x -= 1;
    if (this.keys.get('KeyD')) direction.x += 1;

    direction.normalize();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation.y);

    return direction;
  }

  getCurrentSpeed(): number {
    const isSprinting = this.keys.get('ShiftLeft') || this.keys.get('ShiftRight');
    return isSprinting ? MOVE_SPEED * RUN_MULTIPLIER : MOVE_SPEED;
  }

  update(delta: number, world: any) {
    this.state.velocity.y += GRAVITY * delta;

    const direction = this.getDirection();
    const speed = this.getCurrentSpeed();
    this.state.velocity.x = direction.x * speed;
    this.state.velocity.z = direction.z * speed;

    const newX = this.state.position.x + this.state.velocity.x * delta;
    const newY = this.state.position.y + this.state.velocity.y * delta;
    const newZ = this.state.position.z + this.state.velocity.z * delta;

    if (!this.checkCollision(newX, this.state.position.y, this.state.position.z, world)) {
      this.state.position.x = newX;
    } else {
      this.state.velocity.x = 0;
    }

    if (!this.checkCollision(this.state.position.x, newY, this.state.position.z, world)) {
      this.state.position.y = newY;
      this.state.velocity.y *= 0.99;
    } else {
      if (this.state.velocity.y < 0) {
        this.state.onGround = true;
      }
      this.state.velocity.y = 0;
    }

    if (!this.checkCollision(this.state.position.x, this.state.position.y, newZ, world)) {
      this.state.position.z = newZ;
    } else {
      this.state.velocity.z = 0;
    }

    if (this.state.position.y < -10) {
      this.state.position.y = 10;
      this.state.velocity.y = 0;
    }

    this.updateCamera();
  }

  private checkCollision(x: number, y: number, z: number, world: any): boolean {
    const playerHeight = 1.8;
    const playerRadius = 0.3;

    const checkPoints = [
      { x, y: y + 0.5, z },
      { x, y: y + 1.0, z },
      { x, y: y + 1.5, z },
    ];

    for (const point of checkPoints) {
      for (let dx = -playerRadius; dx <= playerRadius; dx += playerRadius * 2) {
        for (let dz = -playerRadius; dz <= playerRadius; dz += playerRadius * 2) {
          const bx = Math.floor(point.x + dx);
          const by = Math.floor(point.y);
          const bz = Math.floor(point.z + dz);

          if (world.getBlockAt(bx, by, bz)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  getPosition(): { x: number; y: number; z: number } {
    return { ...this.state.position };
  }

  getRotation(): { x: number; y: number } {
    return { ...this.state.rotation };
  }
}
