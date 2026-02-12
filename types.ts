
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';

export enum AppState {
  WIZARD = 'WIZARD',
  WORLD_GEN = 'WORLD_GEN',
  CHARACTER_GEN = 'CHARACTER_GEN',
  PLAYING = 'PLAYING',
  LOADING = 'LOADING',
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING'
}

export interface Skill {
  name: string;
  type: 'basic' | 'special' | 'ultimate';
  damage: number;
  description: string;
  vfxColor: string;
}

export interface EntityStats {
  hp: number;
  maxHp: number;
  speed: number;
  power: number;
  defense: number;
  class: string;
  description: string;
  skills?: Skill[];
  isRanged?: boolean;
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface SavedModel {
  name: string;
  voxels: VoxelData[];
  stats: EntityStats;
}

export interface GameEntity {
  id: string;
  type: 'player' | 'npc' | 'enemy';
  position: THREE.Vector3;
  spawnPosition?: THREE.Vector3;
  patrolTarget?: THREE.Vector3;
  waitTimer?: number;
  lastAttackTime?: number;
  rotation: number;
  voxels: VoxelData[];
  stats: EntityStats;
  isDead: boolean;
  mesh?: THREE.InstancedMesh;
}

export interface WorldManifesto {
  name: string;
  ambient: string;
  lore: string;
  palette: {
    safe: string[];
    hostile: string[];
  };
}

export interface GameChunk {
  x: number;
  z: number;
  type: 'safe' | 'hostile';
  colors: string[];
}
