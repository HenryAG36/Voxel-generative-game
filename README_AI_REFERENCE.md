
# Voxel RPG Architect: Technical Manifesto & Reference

This document serves as a high-level technical map for AI agents and senior engineers extending the **Voxel RPG Architect** project.

---

## 1. Core Architecture
The application follows a **Decoupled Hybrid Architecture**:
- **UI Layer (React/Tailwind)**: Manages application state (`AppState`), user prompts, HUD rendering, and AI orchestration.
- **Engine Layer (Three.js/VoxelEngine)**: A class-based singleton that handles high-frequency rendering, procedural generation, entity AI, and physics.

### State Synchronization
React communicates with the Engine via a ref-based singleton. The Engine maintains its own internal `Clock` and `animationLoop`, while React handles the logic for "Turn-based" UI (Wizard, Character Gen) and "Real-time" HUD updates.

---

## 2. The AI Pipeline (Gemini 3)
The project utilizes `@google/genai` (Gemini 3 Pro) for three critical phases:

1.  **World Architecting**: 
    - Input: Name, Theme, Lore.
    - Output: A 4x4 grid of chunks with assigned types (`safe` vs `hostile`) and hex-color palettes.
2.  **Lifeform Population**:
    - Input: World manifesto.
    - Output: JSON arrays of NPCs and Enemies containing unique voxel coordinates and RPG stats.
3.  **Hero Manifestation**:
    - Input: User natural language prompt.
    - Output: High-density voxel data (200-300 points) and 3 unique skill objects (damage, description, vfxColor).

---

## 3. Movement & Control System
A modern RPG-style **Pointer Lock Controller** is implemented:
- **Mouse-Look**: Yaw and Pitch controls the camera pivot. Pitch is clamped to prevent flipping.
- **Camera-Relative WASD**: Movement vectors are transformed by the current camera `Yaw`. Pressing 'W' always moves the player in the direction they are looking.
- **Smoothing**: Uses `lerp` for velocity and rotation. Player mesh rotates smoothly to face the direction of movement, independent of the camera.

---

## 4. Advanced Gameplay Mechanics

### Stagger System (Stun)
- **Calculation**: Enemies accumulate `staggerPoints` based on raw damage received.
- **Threshold**: Calculated as `(maxHp * 0.25) + (defense * 0.5)`.
- **Trigger**: Once threshold is hit, enemy enters `staggered` state for 2 seconds.
- **Visuals**: Bright yellow tint + Orbiting star particles + "Dizzy" lean animation (sinusoidal rotation).
- **Vulnerability**: Staggered entities receive **1.5x damage**.
- **Decay**: Stagger points naturally decay at 15 points/sec to prevent permanent stuns from weak attacks.

### Loot & Progression
- **Drop Logic**: 60% chance on enemy death to spawn a `LootEntity`.
- **Items**: Health (instant), Buffs (timed power/speed/def), and Materials.
- **Buff Sync**: Handled in `VoxelEngine.animate`. Buffs apply multipliers to base stats and are filtered out once `endTime` passes.

---

## 5. Rendering Performance
- **InstancedMesh**: Used for terrain, props, and entities. This allows thousands of voxels to be rendered in a single draw call.
- **Heightmap**: Procedural height is calculated using a layered Sine/Cosine scale function, ensuring the world is walkable but visually varied.
- **VFX**: All particles (Impact, Stun, Skills) are recycled using `InstancedMesh` for performance stability during heavy combat.

---

## 6. Future Expansion Guidelines
- **Adding Skills**: Ensure new skills define a `vfxColor` and a `type` ('basic', 'special', 'ultimate') for proper SFX/VFX routing in `App.tsx`.
- **New Biomes**: Update `VoxelEngine.setEnvironment` and the `Wizard.tsx` select menu with new color palettes and fog settings.
- **NPC Interactivity**: The `GameEntity` type supports `npc`. Future updates should implement a dialog system triggered by proximity.

---
*Created by Gemini 3 Architect Core*
