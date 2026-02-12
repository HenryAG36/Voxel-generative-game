
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

export interface Buff {
  type: 'power' | 'speed' | 'defense';
  amount: number;
  endTime: number;
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
  buffs?: Buff[];
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
  staggerPoints?: number;
  staggerEndTime?: number;
  rotation: number;
  voxels: VoxelData[];
  stats: EntityStats;
  isDead: boolean;
  mesh?: THREE.InstancedMesh;
}

export interface LootItem {
  id: string;
  name: string;
  type: 'health' | 'buff' | 'material';
  subType?: 'power' | 'speed' | 'defense';
  value: number;
  color: number;
}

export interface LootEntity {
  id: string;
  item: LootItem;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
}

export interface WorldManifesto {
  name: string;
  ambient: string;
  lore: string;
  palette: {
    safe: string[];
    hostile: string[];
  };
  chunks?: GameChunk[];
}

export interface GameChunk {
  x: number;
  z: number;
  type: 'safe' | 'hostile';
  colors: string[];
}

export interface SaveData {
  world: WorldManifesto;
  player: Omit<GameEntity, 'mesh'>;
  entities: Omit<GameEntity, 'mesh'>[];
  timestamp: number;
}
