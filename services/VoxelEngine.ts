
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { VoxelData, GameEntity, LootEntity, LootItem, Buff } from '../types';

interface EnvParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: number;
}

const LOOT_ITEMS: Omit<LootItem, 'id'>[] = [
  { name: 'Ancient Vitality', type: 'health', value: 40, color: 0xff3344 },
  { name: 'Essence of Might', type: 'buff', subType: 'power', value: 10, color: 0xffaa00 },
  { name: 'Vortex Shard', type: 'buff', subType: 'speed', value: 8, color: 0x00ccff },
  { name: 'Ironwill Core', type: 'buff', subType: 'defense', value: 15, color: 0xaaaaaa },
  { name: 'Stardust Scrap', type: 'material', value: 1, color: 0xeeccff },
];

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  private entities: Map<string, GameEntity> = new Map();
  private lootEntities: Map<string, LootEntity> = new Map();
  private terrainChunks: THREE.Group = new THREE.Group();
  private propGroup: THREE.Group = new THREE.Group();
  private vfxGroup: THREE.Group = new THREE.Group();
  
  public playerEntity: GameEntity | null = null;
  private clock = new THREE.Clock();
  private animationId: number = 0;
  private shakeIntensity: number = 0;
  private audioCtx: AudioContext | null = null;
  private sun: THREE.DirectionalLight;

  // Movement & Camera State
  private inputDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraPitch: number = -Math.PI / 6;
  private cameraYaw: number = 0;
  private cameraDistance: number = 40;
  private isPointerLocked: boolean = false;

  // Particle System Properties
  private ambientParticlesMesh: THREE.InstancedMesh | null = null;
  private ambientParticleData: EnvParticle[] = [];
  private particleCount = 400;
  private currentTheme: string = 'Cyberpunk Forest';

  // UI Callback
  public onLootPickup: ((item: LootItem) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);
    this.scene.fog = new THREE.Fog(0x020617, 30, 180);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.position.set(100, 200, 100);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -150;
    this.sun.shadow.camera.right = 150;
    this.sun.shadow.camera.top = 150;
    this.sun.shadow.camera.bottom = -150;
    this.sun.shadow.mapSize.width = 1024;
    this.sun.shadow.mapSize.height = 1024;
    this.scene.add(this.sun);

    this.scene.add(this.terrainChunks);
    this.scene.add(this.propGroup);
    this.scene.add(this.vfxGroup);

    this.initAmbientParticles();
    this.setupPointerLock();

    this.animate = this.animate.bind(this);
    this.animate();

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private setupPointerLock() {
    this.container.addEventListener('mousedown', () => {
      if (!this.isPointerLocked) {
        this.container.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        const sensitivity = 0.002;
        this.cameraYaw -= e.movementX * sensitivity;
        this.cameraPitch -= e.movementY * sensitivity;
        this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(-0.1, this.cameraPitch));
      }
    });
  }

  private initAmbientParticles() {
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6 });
    this.ambientParticlesMesh = new THREE.InstancedMesh(geo, mat, this.particleCount);
    this.ambientParticlesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.ambientParticlesMesh);

    for (let i = 0; i < this.particleCount; i++) {
      this.ambientParticleData.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          Math.random() * 60,
          (Math.random() - 0.5) * 200
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        rotationSpeed: (Math.random() - 0.5) * 0.05
      });
    }
  }

  private updateAmbientParticles(delta: number) {
    if (!this.ambientParticlesMesh) return;

    const matrix = new THREE.Matrix4();
    const range = 100;
    const heightRange = 60;

    this.ambientParticleData.forEach((p, i) => {
      switch (this.currentTheme) {
        case 'Steam-Powered Tundra':
          p.velocity.set(Math.sin(this.clock.elapsedTime + i) * 0.1, -5, 0.1);
          break;
        case 'Magical Oceanic Ruins':
          p.velocity.set(Math.sin(this.clock.elapsedTime * 0.5 + i) * 0.2, 2, 0);
          break;
        case 'Void Desert':
          p.velocity.set(3, Math.sin(this.clock.elapsedTime * 0.3 + i) * 0.5, 1);
          break;
        case 'Floating Sky Citadel':
          p.velocity.set(
            Math.cos(this.clock.elapsedTime * 0.2 + i) * 0.5,
            Math.sin(this.clock.elapsedTime * 0.2 + i) * 0.5,
            Math.sin(this.clock.elapsedTime * 0.2 + i) * 0.5
          );
          break;
        default:
          p.velocity.set(0, Math.sin(this.clock.elapsedTime + i) * 0.4, 0);
      }

      p.position.add(p.velocity.clone().multiplyScalar(delta));

      if (p.position.y < 0) p.position.y = heightRange;
      if (p.position.y > heightRange) p.position.y = 0;
      if (Math.abs(p.position.x) > range) p.position.x = -Math.sign(p.position.x) * (range - 1);
      if (Math.abs(p.position.z) > range) p.position.z = -Math.sign(p.position.z) * (range - 1);

      matrix.makeTranslation(p.position.x, p.position.y, p.position.z);
      matrix.multiply(new THREE.Matrix4().makeRotationY(this.clock.elapsedTime * p.rotationSpeed));
      this.ambientParticlesMesh!.setMatrixAt(i, matrix);
    });

    this.ambientParticlesMesh.instanceMatrix.needsUpdate = true;
  }

  public setEnvironment(theme: string) {
    this.currentTheme = theme;
    let bgColor = 0x020617;
    let sunColor = 0xffffff;
    let pColor = 0xffffff;
    
    switch (theme) {
        case 'Cyberpunk Forest': bgColor = 0x0c001c; sunColor = 0x00ffcc; pColor = 0xff00ff; break;
        case 'Steam-Powered Tundra': bgColor = 0xd0e0f0; sunColor = 0xffaa00; pColor = 0xffffff; break;
        case 'Magical Oceanic Ruins': bgColor = 0x001a1a; sunColor = 0x00ffff; pColor = 0x0088ff; break;
        case 'Floating Sky Citadel': bgColor = 0x87ceeb; sunColor = 0xffffff; pColor = 0xffffff; break;
        case 'Void Desert': bgColor = 0x1a0a00; sunColor = 0xff4400; pColor = 0xaa8866; break;
    }

    this.scene.background = new THREE.Color(bgColor);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.set(bgColor);
    this.sun.color.set(sunColor);

    if (this.ambientParticlesMesh) {
      for (let i = 0; i < this.particleCount; i++) {
        this.ambientParticlesMesh.setColorAt(i, new THREE.Color(pColor));
      }
      if (this.ambientParticlesMesh.instanceColor) this.ambientParticlesMesh.instanceColor.needsUpdate = true;
    }
  }

  private getHeight(x: number, z: number, type: 'safe' | 'hostile'): number {
    const scale = 0.08;
    let h = Math.sin(x * scale) * Math.cos(z * scale) * 4;
    h += Math.sin(x * scale * 2) * 1.5;
    if (type === 'hostile') h *= 1.8;
    return h;
  }

  public clearEntities() {
    this.entities.forEach(e => {
      if (e.mesh) this.scene.remove(e.mesh);
    });
    this.entities.clear();
    this.lootEntities.forEach(l => {
      this.scene.remove(l.mesh);
      this.scene.remove(l.light);
    });
    this.lootEntities.clear();
    this.playerEntity = null;
  }

  public generateWorld(chunks: Array<{ x: number, z: number, type: 'safe' | 'hostile', colors: string[] }>, theme: string) {
    this.setEnvironment(theme);
    while(this.terrainChunks.children.length > 0) {
        const c = this.terrainChunks.children[0] as THREE.InstancedMesh;
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
        this.terrainChunks.remove(c);
    }
    while(this.propGroup.children.length > 0) this.propGroup.remove(this.propGroup.children[0]);

    const chunkSize = 40;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9 });

    chunks.forEach(chunk => {
        const mesh = new THREE.InstancedMesh(geometry, material, chunkSize * chunkSize);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        let idx = 0;
        for(let x = 0; x < chunkSize; x++) {
            for(let z = 0; z < chunkSize; z++) {
                const wx = chunk.x * chunkSize + x - chunkSize/2;
                const wz = chunk.z * chunkSize + z - chunkSize/2;
                const h = this.getHeight(wx, wz, chunk.type);
                mesh.setMatrixAt(idx, new THREE.Matrix4().makeTranslation(wx, h - 2, wz));
                const color = new THREE.Color(chunk.colors[Math.floor(Math.random() * chunk.colors.length)]);
                mesh.setColorAt(idx, color.multiplyScalar(0.9 + h * 0.05));
                if (Math.random() < 0.006) this.spawnDecoration(new THREE.Vector3(wx, h - 0.5, wz), theme, chunk.type);
                idx++;
            }
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        this.terrainChunks.add(mesh);
    });
  }

  private spawnDecoration(pos: THREE.Vector3, theme: string, type: 'safe' | 'hostile') {
    const color = type === 'hostile' ? 0xff4400 : 0x00ffaa;
    const height = 3 + Math.random() * 5;
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: color, emissiveIntensity: 0.2 });
    const mesh = new THREE.InstancedMesh(geometry, material, Math.floor(height) + 4);
    for(let y = 0; y < height; y++) {
        mesh.setMatrixAt(y, new THREE.Matrix4().makeTranslation(0, y, 0));
        mesh.setColorAt(y, new THREE.Color(color));
    }
    mesh.position.copy(pos);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.propGroup.add(mesh);
  }

  public spawnEntity(data: GameEntity) {
    const geometry = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const mesh = new THREE.InstancedMesh(geometry, material, data.voxels.length);
    mesh.castShadow = true;
    data.voxels.forEach((v, i) => {
        mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(v.x, v.y, v.z));
        mesh.setColorAt(i, new THREE.Color(v.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    
    // Check if we should use existing position or heightmap
    if (!data.position.y && data.position.y !== 0) {
      const h = this.getHeight(data.position.x, data.position.z, data.type === 'enemy' ? 'hostile' : 'safe');
      data.position.y = h;
    }
    
    if (!data.spawnPosition) data.spawnPosition = data.position.clone();
    
    mesh.position.copy(data.position);
    mesh.rotation.y = data.rotation || 0;
    this.scene.add(mesh);
    data.mesh = mesh;
    this.entities.set(data.id, data);
    if (data.type === 'player') {
        this.playerEntity = data;
        this.playerEntity.stats.buffs = this.playerEntity.stats.buffs || [];
        // Only reset camera if it's a fresh spawn, not a load
        if (!data.id.includes('loaded')) {
           this.cameraYaw = 0;
           this.cameraPitch = -Math.PI / 6;
        }
    }
  }

  public setInputDirection(dir: THREE.Vector3) {
    this.inputDirection.copy(dir);
  }

  public spawnImpactParticles(pos: THREE.Vector3, color: string = '#ffffff', count: number = 5) {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    this.vfxGroup.add(mesh);

    const startTime = this.clock.getElapsedTime();
    const velocities = Array.from({ length: count }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 4
    ));

    const matrix = new THREE.Matrix4();
    const animate = () => {
      const elapsed = this.clock.getElapsedTime() - startTime;
      const t = elapsed / 0.6;
      if (t >= 1) {
        this.vfxGroup.remove(mesh);
        geo.dispose();
        mat.dispose();
        return;
      }

      for (let i = 0; i < count; i++) {
        const p = pos.clone().add(velocities[i].clone().multiplyScalar(elapsed));
        p.y -= 9.8 * 0.5 * elapsed * elapsed;
        matrix.makeTranslation(p.x, p.y, p.z);
        matrix.multiply(new THREE.Matrix4().makeScale(1 - t, 1 - t, 1 - t));
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      requestAnimationFrame(animate);
    };
    animate();
  }

  public spawnStunStars(entity: GameEntity, duration: number) {
    const starCount = 3;
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.InstancedMesh(geo, mat, starCount);
    this.vfxGroup.add(mesh);

    const startTime = this.clock.getElapsedTime();
    const matrix = new THREE.Matrix4();
    const animate = () => {
      const elapsed = this.clock.getElapsedTime() - startTime;
      if (elapsed >= duration || entity.isDead) {
        this.vfxGroup.remove(mesh);
        return;
      }

      for (let i = 0; i < starCount; i++) {
        const angle = (elapsed * 8) + (i * Math.PI * 2 / starCount);
        const orbitRadius = 4;
        const orbitX = Math.cos(angle) * orbitRadius;
        const orbitZ = Math.sin(angle) * orbitRadius;
        
        // Star voxels float above the entity head
        matrix.makeTranslation(
          entity.position.x + orbitX,
          entity.position.y + 12 + Math.sin(elapsed * 10) * 0.5,
          entity.position.z + orbitZ
        );
        matrix.multiply(new THREE.Matrix4().makeRotationY(elapsed * 5));
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      requestAnimationFrame(animate);
    };
    animate();
  }

  public playSfx(type: string) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain); gain.connect(this.audioCtx.destination);

    if (type.includes('ultimate')) {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(40, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 1.0);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 1.0);
    } else if (type.includes('skill')) {
        osc.type = 'square'; osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
    } else if (type.includes('ranged')) {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.1);
    } else if (type.includes('pickup')) {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
    } else if (type.includes('stagger')) {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
    } else {
        osc.type = 'sine'; osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.1);
    }
    osc.start(); osc.stop(now + 1.0);
  }

  public playSkillVFX(start: THREE.Vector3, end: THREE.Vector3, color: string, type: string) {
    const geo = new THREE.SphereGeometry(type === 'ultimate' ? 3 : (type === 'ranged' ? 0.3 : 0.8), 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    this.vfxGroup.add(mesh);
    const duration = type === 'ranged' ? 0.6 : 0.4;
    const startTime = this.clock.getElapsedTime();
    const animate = () => {
        const t = (this.clock.getElapsedTime() - startTime) / duration;
        if (t >= 1) { this.vfxGroup.remove(mesh); return; }
        mesh.position.lerpVectors(start, end, t);
        if (type === 'ultimate') mesh.scale.setScalar(1 + t * 3);
        requestAnimationFrame(animate);
    };
    animate();
  }

  public damageEntity(id: string, amount: number) {
    const e = this.entities.get(id);
    if (!e || e.isDead || !e.mesh) return;
    
    // Apply defense calculation
    const now = this.clock.getElapsedTime();
    const isStaggered = e.type === 'enemy' && (e.staggerEndTime || 0) > now;
    
    // Staggered enemies take 1.5x damage!
    const multiplier = isStaggered ? 1.5 : 1.0;
    const damage = Math.max(1, (amount * multiplier) - (e.stats.defense * 0.2));
    
    e.stats.hp -= damage;
    this.shakeIntensity = id === 'player' ? 1.5 : 0.6;
    this.playSfx('damage');

    // --- STAGGER LOGIC ---
    if (e.type === 'enemy') {
        e.staggerPoints = (e.staggerPoints || 0) + damage;
        // Threshold: 25% of max HP, but adjusted by defense to reward heavy hitters
        const staggerThreshold = (e.stats.maxHp * 0.25) + (e.stats.defense * 0.5);

        if (e.staggerPoints >= staggerThreshold && !isStaggered) {
            const stunDuration = 2.0; // Slightly longer 2-second stun
            e.staggerEndTime = now + stunDuration; 
            e.staggerPoints = 0; 
            this.playSfx('stagger');
            this.spawnImpactParticles(e.position, '#ffff00', 12);
            this.spawnStunStars(e, stunDuration);
            
            // Visual feedback: Yellow stun tint
            for(let i = 0; i < e.mesh.count; i++) e.mesh.setColorAt(i, new THREE.Color(0xffff00));
            if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
        } else if (!isStaggered) {
            // Normal damage flash
            for(let i = 0; i < e.mesh.count; i++) e.mesh.setColorAt(i, new THREE.Color(0xffffff));
            if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
        }
    } else {
        // Player damage flash
        for(let i = 0; i < e.mesh.count; i++) e.mesh.setColorAt(i, new THREE.Color(0xffffff));
        if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
    }
    
    this.spawnImpactParticles(e.position, '#ff3300', 8);

    setTimeout(() => {
        if (!e.mesh || e.isDead) return;
        const currentNow = this.clock.getElapsedTime();
        if (e.type === 'enemy' && (e.staggerEndTime || 0) > currentNow) {
            for(let i = 0; i < e.mesh.count; i++) e.mesh.setColorAt(i, new THREE.Color(0xffff00));
        } else {
            e.voxels.forEach((v, i) => e.mesh!.setColorAt(i, new THREE.Color(v.color)));
        }
        if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
    }, 150);

    if (e.stats.hp <= 0) {
        e.isDead = true;
        this.spawnImpactParticles(e.position, '#ffffff', 20);
        this.handleEnemyDeath(e);
        this.scene.remove(e.mesh);
    }
  }

  private handleEnemyDeath(e: GameEntity) {
    if (e.type !== 'enemy') return;
    // 60% chance to drop loot
    if (Math.random() < 0.6) {
      this.spawnLoot(e.position.clone());
    }
  }

  private spawnLoot(pos: THREE.Vector3) {
    const itemData = LOOT_ITEMS[Math.floor(Math.random() * LOOT_ITEMS.length)];
    const item: LootItem = { ...itemData, id: Math.random().toString() };
    
    const geo = new THREE.OctahedronGeometry(1.2, 0);
    const mat = new THREE.MeshStandardMaterial({ 
      color: item.color, 
      emissive: item.color, 
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos).y += 2;
    mesh.castShadow = true;
    this.scene.add(mesh);

    const light = new THREE.PointLight(item.color, 2, 8);
    light.position.copy(mesh.position);
    this.scene.add(light);

    this.lootEntities.set(item.id, { id: item.id, item, position: mesh.position, mesh, light });
  }

  private updateLoot(delta: number) {
    if (!this.playerEntity) return;

    this.lootEntities.forEach((loot, id) => {
      // Animation: floating and rotating
      loot.mesh.rotation.y += delta * 2;
      loot.mesh.position.y += Math.sin(this.clock.elapsedTime * 3) * 0.01;
      loot.light.position.copy(loot.mesh.position);

      // Pickup check
      const dist = loot.position.distanceTo(this.playerEntity!.position);
      if (dist < 4) {
        this.collectLoot(loot);
      }
    });
  }

  private collectLoot(loot: LootEntity) {
    if (!this.playerEntity) return;
    
    this.playSfx('pickup');
    this.spawnImpactParticles(loot.position, '#' + loot.item.color.toString(16).padStart(6, '0'), 15);
    
    const item = loot.item;
    if (item.type === 'health') {
      this.playerEntity.stats.hp = Math.min(this.playerEntity.stats.maxHp, this.playerEntity.stats.hp + item.value);
    } else if (item.type === 'buff' && item.subType) {
      const buff: Buff = {
        type: item.subType,
        amount: item.value,
        endTime: this.clock.elapsedTime + 30 // 30 seconds duration
      };
      this.playerEntity.stats.buffs = this.playerEntity.stats.buffs || [];
      this.playerEntity.stats.buffs.push(buff);
    }

    if (this.onLootPickup) this.onLootPickup(item);

    this.scene.remove(loot.mesh);
    this.scene.remove(loot.light);
    this.lootEntities.delete(loot.id);
  }

  public getNearestHostile(range: number): GameEntity | null {
    if (!this.playerEntity) return null;
    let near: GameEntity | null = null;
    let minDist = range;
    this.entities.forEach(e => {
        if (e.type === 'enemy' && !e.isDead) {
            const d = e.position.distanceTo(this.playerEntity!.position);
            if (d < minDist) { minDist = d; near = e; }
        }
    });
    return near;
  }

  public getAllEntities(): GameEntity[] {
    return Array.from(this.entities.values());
  }

  private updateAI(delta: number) {
    if (!this.playerEntity || this.playerEntity.isDead) return;
    const now = this.clock.getElapsedTime();

    this.entities.forEach(e => {
        if (e.type !== 'enemy' || e.isDead || !e.mesh) return;
        
        // Decay stagger points over time
        if ((e.staggerPoints || 0) > 0) {
            e.staggerPoints = Math.max(0, (e.staggerPoints || 0) - delta * 15); 
        }

        // --- STAGGER CHECK ---
        const isStaggered = (e.staggerEndTime || 0) > now;
        if (isStaggered) {
            // "Dizzy" lean animation
            const swayX = Math.sin(now * 12) * 0.15;
            const swayZ = Math.cos(now * 10) * 0.15;
            e.mesh.rotation.x = swayX;
            e.mesh.rotation.z = swayZ;
            e.mesh.rotation.y += delta * 0.5; // Slow disorientation rotation
            return; // Skip AI logic while staggered
        } else {
            // Reset rotation if no longer staggered
            e.mesh.rotation.x = THREE.MathUtils.lerp(e.mesh.rotation.x, 0, 0.1);
            e.mesh.rotation.z = THREE.MathUtils.lerp(e.mesh.rotation.z, 0, 0.1);
        }

        const dist = e.position.distanceTo(this.playerEntity!.position);
        const hpPercent = (e.stats.hp / e.stats.maxHp);
        
        let moveDir = new THREE.Vector3(0, 0, 0);
        let speedMult = 1.0;

        if (hpPercent < 0.3 && dist < 20) {
            moveDir.copy(e.position).sub(this.playerEntity!.position).normalize();
            speedMult = 1.4;
        } else if (dist < 45 && dist > 10) {
            moveDir.copy(this.playerEntity!.position).sub(e.position).normalize();
            speedMult = 1.1;
        } else if (dist <= 10) {
            if (now - (e.lastAttackTime || 0) > 1.5) {
                if (e.stats.isRanged || e.stats.class.toLowerCase().includes('mage') || e.stats.class.toLowerCase().includes('archer')) {
                    this.playSfx('ranged');
                    this.playSkillVFX(e.position.clone().add(new THREE.Vector3(0, 4, 0)), this.playerEntity!.position.clone().add(new THREE.Vector3(0, 4, 0)), '#ff4400', 'ranged');
                    this.damageEntity('player', e.stats.power * 0.5);
                } else if (dist <= 6) {
                    this.damageEntity('player', e.stats.power * 0.8);
                }
                e.lastAttackTime = now;
            }
            moveDir.copy(this.playerEntity!.position).sub(e.position).normalize();
            speedMult = 0.3; 
        } else {
            const patrolRadius = 25;
            const spawnPos = e.spawnPosition || e.position;
            
            if ((e.waitTimer || 0) > 0) {
                e.waitTimer = (e.waitTimer || 0) - delta;
                moveDir.set(0, 0, 0);
            } else {
                if (!e.patrolTarget || e.position.distanceTo(e.patrolTarget) < 1.5) {
                    if (Math.random() < 0.7) {
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.random() * patrolRadius;
                        e.patrolTarget = spawnPos.clone().add(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
                        e.patrolTarget.y = this.getHeight(e.patrolTarget.x, e.patrolTarget.z, 'hostile');
                    } else {
                        e.waitTimer = 2 + Math.random() * 3;
                    }
                }

                if (e.patrolTarget && (e.waitTimer || 0) <= 0) {
                    moveDir.copy(e.patrolTarget).sub(e.position).normalize();
                    speedMult = 0.5;
                }
            }
        }

        if (moveDir.length() > 0) {
            const speed = (e.stats.speed || 8) * speedMult;
            e.position.add(moveDir.clone().multiplyScalar(speed * delta));
            e.position.y = THREE.MathUtils.lerp(e.position.y, this.getHeight(e.position.x, e.position.z, 'hostile'), 0.2);
            e.mesh.position.copy(e.position);
            
            const targetRot = Math.atan2(moveDir.x, moveDir.z);
            let diff = targetRot - e.mesh.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            e.mesh.rotation.y += diff * 0.1;
            e.rotation = e.mesh.rotation.y;
        }
    });
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    if (this.playerEntity && this.playerEntity.mesh && !this.playerEntity.isDead) {
        const now = this.clock.elapsedTime;
        
        // Update buffs and calculate effective stats
        this.playerEntity.stats.buffs = this.playerEntity.stats.buffs?.filter(b => b.endTime > now) || [];
        
        let powerBonus = 0;
        let speedBonus = 0;
        let defenseBonus = 0;
        
        this.playerEntity.stats.buffs.forEach(b => {
          if (b.type === 'power') powerBonus += b.amount;
          if (b.type === 'speed') speedBonus += b.amount;
          if (b.type === 'defense') defenseBonus += b.amount;
        });

        // 1. Calculate camera-relative movement vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.cameraYaw, 0)));
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.cameraYaw, 0)));
        
        const targetVelocity = new THREE.Vector3();
        if (this.inputDirection.z < 0) targetVelocity.add(forward);
        if (this.inputDirection.z > 0) targetVelocity.sub(forward);
        if (this.inputDirection.x < 0) targetVelocity.sub(right);
        if (this.inputDirection.x > 0) targetVelocity.add(right);
        
        if (targetVelocity.length() > 0) targetVelocity.normalize();
        
        const baseSpeed = this.playerEntity.stats.speed + speedBonus;
        const moveSpeed = baseSpeed * 2.0;
        const acceleration = 40.0;
        const friction = 12.0;

        // 2. Smooth acceleration/deceleration
        if (targetVelocity.length() > 0) {
            this.playerVelocity.lerp(targetVelocity.multiplyScalar(moveSpeed), acceleration * delta / moveSpeed);
        } else {
            this.playerVelocity.lerp(new THREE.Vector3(0,0,0), friction * delta);
        }

        // 3. Apply velocity to position
        this.playerEntity.position.add(this.playerVelocity.clone().multiplyScalar(delta));
        this.playerEntity.position.y = THREE.MathUtils.lerp(this.playerEntity.position.y, this.getHeight(this.playerEntity.position.x, this.playerEntity.position.z, 'safe'), 0.2);
        this.playerEntity.mesh.position.copy(this.playerEntity.position);

        // 4. Update player rotation to face movement direction
        if (this.playerVelocity.length() > 0.5) {
            const targetRot = Math.atan2(this.playerVelocity.x, this.playerVelocity.z);
            let diff = targetRot - this.playerEntity.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerEntity.rotation += diff * 0.15;
            this.playerEntity.mesh.rotation.y = this.playerEntity.rotation;

            if (Math.random() < 0.2) {
              this.spawnImpactParticles(this.playerEntity.position, '#ffffff33', 1);
            }
        }

        const cameraPos = new THREE.Vector3(0, 0, this.cameraDistance);
        cameraPos.applyEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
        cameraPos.add(this.playerEntity.position);
        cameraPos.y += 5;

        this.camera.position.lerp(cameraPos, 0.2);
        this.camera.lookAt(this.playerEntity.position.clone().add(new THREE.Vector3(0, 5, 0)));
    }

    this.updateAmbientParticles(delta);
    this.updateAI(delta);
    this.updateLoot(delta);

    if (this.shakeIntensity > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeIntensity *= 0.85;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    if (this.audioCtx) this.audioCtx.close();
  }
}
