
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VoxelData, GameEntity } from '../types';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  private entities: Map<string, GameEntity> = new Map();
  private terrainChunks: THREE.Group = new THREE.Group();
  private propGroup: THREE.Group = new THREE.Group();
  private vfxGroup: THREE.Group = new THREE.Group();
  
  public playerEntity: GameEntity | null = null;
  private clock = new THREE.Clock();
  private animationId: number = 0;
  private shakeIntensity: number = 0;
  private audioCtx: AudioContext | null = null;
  private sun: THREE.DirectionalLight;

  private inputDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);
    this.scene.fog = new THREE.Fog(0x020617, 30, 180);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 40, 50);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 100;

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

    this.animate = this.animate.bind(this);
    this.animate();

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public setEnvironment(theme: string) {
    let bgColor = 0x020617;
    let sunColor = 0xffffff;
    
    switch (theme) {
        case 'Cyberpunk Forest': bgColor = 0x0c001c; sunColor = 0x00ffcc; break;
        case 'Steam-Powered Tundra': bgColor = 0xd0e0f0; sunColor = 0xffaa00; break;
        case 'Magical Oceanic Ruins': bgColor = 0x001a1a; sunColor = 0x00ffff; break;
        case 'Floating Sky Citadel': bgColor = 0x87ceeb; sunColor = 0xffffff; break;
        case 'Void Desert': bgColor = 0x1a0a00; sunColor = 0xff4400; break;
    }

    this.scene.background = new THREE.Color(bgColor);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.set(bgColor);
    this.sun.color.set(sunColor);
  }

  private getHeight(x: number, z: number, type: 'safe' | 'hostile'): number {
    const scale = 0.08;
    let h = Math.sin(x * scale) * Math.cos(z * scale) * 4;
    h += Math.sin(x * scale * 2) * 1.5;
    if (type === 'hostile') h *= 1.8;
    return h;
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
    
    const h = this.getHeight(data.position.x, data.position.z, data.type === 'enemy' ? 'hostile' : 'safe');
    data.position.y = h;
    data.spawnPosition = data.position.clone();
    data.patrolTarget = null as any;
    data.waitTimer = 0;
    data.lastAttackTime = 0;
    
    mesh.position.copy(data.position);
    this.scene.add(mesh);
    data.mesh = mesh;
    this.entities.set(data.id, data);
    if (data.type === 'player') {
        this.playerEntity = data;
        this.controls.target.copy(data.position);
    }
  }

  public setInputDirection(dir: THREE.Vector3) {
    this.inputDirection.copy(dir);
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
    e.stats.hp -= amount;
    this.shakeIntensity = id === 'player' ? 1.5 : 0.6;
    this.playSfx('damage');
    
    for(let i = 0; i < e.mesh.count; i++) e.mesh.setColorAt(i, new THREE.Color(0xffffff));
    if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
    setTimeout(() => {
        if (!e.mesh || e.isDead) return;
        e.voxels.forEach((v, i) => e.mesh!.setColorAt(i, new THREE.Color(v.color)));
        if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
    }, 100);

    if (e.stats.hp <= 0) {
        e.isDead = true;
        this.scene.remove(e.mesh);
    }
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

  private updateAI(delta: number) {
    if (!this.playerEntity || this.playerEntity.isDead) return;
    const now = this.clock.getElapsedTime();

    this.entities.forEach(e => {
        if (e.type !== 'enemy' || e.isDead || !e.mesh) return;
        
        const dist = e.position.distanceTo(this.playerEntity!.position);
        const hpPercent = (e.stats.hp / e.stats.maxHp);
        
        let moveDir = new THREE.Vector3(0, 0, 0);
        let speedMult = 1.0;

        // BEHAVIOR SELECTION
        if (hpPercent < 0.3 && dist < 20) {
            // FLEE: Run away from player
            moveDir.copy(e.position).sub(this.playerEntity!.position).normalize();
            speedMult = 1.4;
        } else if (dist < 45 && dist > 10) {
            // CHASE: Move towards player
            moveDir.copy(this.playerEntity!.position).sub(e.position).normalize();
            speedMult = 1.1;
        } else if (dist <= 10) {
            // ATTACK: Handle Melee vs Ranged
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
            // Combat positioning: orbit slightly or maintain distance
            moveDir.copy(this.playerEntity!.position).sub(e.position).normalize();
            speedMult = 0.3; 
        } else {
            // ENHANCED PATROL: Wander within radius of spawn
            const patrolRadius = 25;
            const spawnPos = e.spawnPosition || e.position;
            
            // If waiting, decrement timer and do nothing
            if ((e.waitTimer || 0) > 0) {
                e.waitTimer = (e.waitTimer || 0) - delta;
                moveDir.set(0, 0, 0);
                // Occasionally look around
                if (Math.random() < 0.05) {
                    e.mesh.rotation.y += (Math.random() - 0.5) * 0.2;
                }
            } else {
                // If no target or reached target, pick a new one or wait
                if (!e.patrolTarget || e.position.distanceTo(e.patrolTarget) < 1.5) {
                    if (Math.random() < 0.7) {
                        // Pick new random spot within radius of spawn
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.random() * patrolRadius;
                        e.patrolTarget = spawnPos.clone().add(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
                        // Update Y for the target so movement is directed properly
                        e.patrolTarget.y = this.getHeight(e.patrolTarget.x, e.patrolTarget.z, 'hostile');
                    } else {
                        // Decision to wait for a few seconds
                        e.waitTimer = 2 + Math.random() * 3;
                    }
                }

                if (e.patrolTarget && (e.waitTimer || 0) <= 0) {
                    moveDir.copy(e.patrolTarget).sub(e.position).normalize();
                    speedMult = 0.5;
                }
            }
        }

        // Apply Movement & Rotation
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
        }
    });
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    if (this.playerEntity && this.playerEntity.mesh && !this.playerEntity.isDead) {
        const speed = this.playerEntity.stats.speed * 1.5;
        this.playerEntity.position.add(this.inputDirection.clone().multiplyScalar(speed * delta));
        this.playerEntity.position.y = THREE.MathUtils.lerp(this.playerEntity.position.y, this.getHeight(this.playerEntity.position.x, this.playerEntity.position.z, 'safe'), 0.2);
        this.playerEntity.mesh.position.copy(this.playerEntity.position);
        if (this.inputDirection.length() > 0) {
            const targetRot = Math.atan2(this.inputDirection.x, this.inputDirection.z);
            let diff = targetRot - this.playerEntity.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerEntity.rotation += diff * 0.15;
            this.playerEntity.mesh.rotation.y = this.playerEntity.rotation;
        }
        this.controls.target.lerp(this.playerEntity.position, 0.1);
    }

    this.updateAI(delta);

    if (this.shakeIntensity > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeIntensity *= 0.85;
    }

    this.controls.update();
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
