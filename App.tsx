
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VoxelEngine } from './services/VoxelEngine';
import { Wizard } from './components/Wizard';
import { PromptModal } from './components/PromptModal';
import { AppState, WorldManifesto, GameEntity, SaveData } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import { Shield, Zap, Sword, Move, Brain, Loader2, Info, AlertTriangle, MousePointer2, Sparkles, Save, FolderOpen } from 'lucide-react';

const LoadingScreen: React.FC<{ message: string; progress: number }> = ({ message, progress }) => {
  const [subMsg, setSubMsg] = useState('Syncing Neural Pathways...');
  const subMsgs = [
    'Optimizing Voxel Mesh...',
    'Seeding Procedural Biomes...',
    'Synthesizing NPC Personalities...',
    'Calculating Combat Balancing...',
    'Mapping Continental Plates...',
    'Forging Heroic Stats...',
    'Calibrating Atmospheric Density...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setSubMsg(subMsgs[Math.floor(Math.random() * subMsgs.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-12 overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="relative mb-12">
          <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center">
            <Brain className="text-indigo-400 animate-pulse" size={48} />
          </div>
          <svg className="absolute -top-1 -left-1 w-34 h-34 -rotate-90">
            <circle
              cx="66" cy="66" r="64"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={402}
              strokeDashoffset={402 - (402 * progress) / 100}
              className="text-indigo-500 transition-all duration-700 ease-out"
            />
          </svg>
        </div>

        <div className="text-center w-full">
          <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {message}
          </h2>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em] h-4">
             <Loader2 size={12} className="animate-spin" /> {subMsg}
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  
  const [gameState, setGameState] = useState<AppState>(AppState.WIZARD);
  const [world, setWorld] = useState<WorldManifesto | null>(null);
  const [player, setPlayer] = useState<GameEntity | null>(null);
  const [loading, setLoading] = useState({ active: false, msg: '', progress: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, msg: string, color: string }[]>([]);

  const joystickRef = useRef<{ active: boolean, start: {x: number, y: number} }>({ active: false, start: {x: 0, y: 0} });
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current || gameState === AppState.WIZARD) return;
    if (!engineRef.current) {
      engineRef.current = new VoxelEngine(containerRef.current);
      engineRef.current.onLootPickup = (item) => {
        const id = Math.random().toString();
        const color = '#' + item.color.toString(16).padStart(6, '0');
        notify(`+ ${item.name}`, color);
      };
    }

    const updateMovement = () => {
        if (!engineRef.current) return;
        const dir = new THREE.Vector3(0, 0, 0);
        if (keysPressed.current.has('w')) dir.z -= 1;
        if (keysPressed.current.has('s')) dir.z += 1;
        if (keysPressed.current.has('a')) dir.x -= 1;
        if (keysPressed.current.has('d')) dir.x += 1;
        if (joystickRef.current.active) {
          dir.x += joystickOffset.x / 50;
          dir.z += joystickOffset.y / 50;
        }
        engineRef.current.setInputDirection(dir);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== AppState.PLAYING || !player || player.isDead) return;
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) { keysPressed.current.add(key); updateMovement(); }
        if (e.key === '1') executeSkill(0);
        if (e.key === '2') executeSkill(1);
        if (e.key === '3') executeSkill(2);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) { keysPressed.current.delete(key); updateMovement(); }
    };
    
    const handlePointerLockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    const handleResize = () => engineRef.current?.handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
        window.removeEventListener('resize', handleResize);
    };
  }, [gameState, player, joystickOffset]);

  const notify = (msg: string, color: string = '#818cf8') => {
    const id = Math.random().toString();
    setNotifications(prev => [...prev, { id, msg, color }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const executeSkill = (index: number) => {
      if (!player?.stats.skills?.[index] || !engineRef.current || player.isDead) return;
      const skill = player.stats.skills[index];
      const target = engineRef.current.getNearestHostile(skill.type === 'ultimate' ? 40 : 20);
      const startPos = player.position.clone().add(new THREE.Vector3(0, 4, 0));
      const endPos = target ? target.position.clone().add(new THREE.Vector3(0, 4, 0)) : player.position.clone().add(new THREE.Vector3(Math.sin(player.rotation)*15, 4, Math.cos(player.rotation)*15));

      let powerBonus = 0;
      player.stats.buffs?.forEach(b => { if(b.type === 'power') powerBonus += b.amount; });
      const finalDamage = skill.damage + (powerBonus * 0.5);

      engineRef.current.playSfx(`skill-${skill.type}`);
      engineRef.current.playSkillVFX(startPos, endPos, skill.vfxColor || '#ffffff', skill.type);
      if (target) engineRef.current.damageEntity(target.id, finalDamage);
  };

  const initWorld = async (data: { name: string; ambient: string; lore: string }) => {
    setLoading({ active: true, msg: 'Architecting World Layer', progress: 10 });
    setError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Game Realm: ${data.name}. Ambient: ${data.ambient}. Lore: ${data.lore}. 
                       Define 16 chunk grid (4x4). Return JSON palette (hex strings) and chunks list.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        palette: { type: Type.OBJECT, properties: { safe: { type: Type.ARRAY, items: { type: Type.STRING } }, hostile: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                        chunks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.INTEGER }, z: { type: Type.INTEGER }, type: { type: Type.STRING } } } }
                    },
                    required: ["palette", "chunks"]
                }
            }
        });
        const result = JSON.parse(response.text);
        const worldManifesto: WorldManifesto = { ...data, palette: result.palette, chunks: result.chunks };
        setWorld(worldManifesto);
        setLoading(p => ({ ...p, progress: 30, msg: 'Generating Terrain Mesh' }));
        engineRef.current?.generateWorld(result.chunks.map((c:any) => ({ ...c, colors: c.type === 'safe' ? result.palette.safe : result.palette.hostile })), data.ambient);
        await generateEntities(worldManifesto);
    } catch (e) {
        console.error(e);
        setError("Dimensional Collapse: Failed to initialize world.");
        setLoading(p => ({ ...p, active: false }));
        setGameState(AppState.WIZARD);
    }
  };

  const generateEntities = async (manifesto: WorldManifesto) => {
    setLoading(p => ({ ...p, progress: 50, msg: 'Populating Lifeforms' }));
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `World: ${manifesto.name}. Create 8 entities (NPCs and Enemies). Return JSON with name, type, voxels (approx 30-50 per entity), stats.`,
            config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        if (result.entities) {
          result.entities.forEach((ent: any) => {
              const chunk = manifesto.chunks![Math.floor(Math.random() * manifesto.chunks!.length)];
              engineRef.current?.spawnEntity({
                  id: Math.random().toString(),
                  type: ent.type === 'enemy' ? 'enemy' : 'npc',
                  position: new THREE.Vector3(chunk.x * 40 + (Math.random()-0.5)*10, 0, chunk.z * 40 + (Math.random()-0.5)*10),
                  rotation: 0,
                  voxels: ent.voxels.map((v:any) => ({ ...v, color: parseInt(v.color.replace('#',''), 16) })),
                  stats: { ...ent.stats, maxHp: ent.stats.hp, speed: 10 },
                  isDead: false
              });
          });
        }
        setLoading(p => ({ ...p, progress: 75, msg: 'Ready for Hero Manifestation' }));
        setTimeout(() => {
          setLoading(p => ({ ...p, active: false }));
          setGameState(AppState.CHARACTER_GEN);
        }, 1000);
    } catch (e) {
        console.error(e);
        setGameState(AppState.CHARACTER_GEN);
    }
  };

  const createHero = async (prompt: string) => {
    setLoading({ active: true, msg: 'Manifesting Hero Avatar', progress: 10 });
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Hero Prompt: ${prompt}. Theme: ${world?.ambient}. Generate complex voxel model (approx 200-300 voxels) and 3 unique RPG skills.`,
            config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        setLoading(p => ({ ...p, progress: 80, msg: 'Calibrating Skill Power' }));
        const hero: GameEntity = {
            id: 'player', type: 'player', position: new THREE.Vector3(0, 0, 0), rotation: 0,
            voxels: result.voxels.map((v:any) => ({ ...v, color: parseInt(v.color.replace('#',''), 16) })),
            stats: { ...result.stats, maxHp: result.stats.hp, speed: 12, defense: 10, description: result.stats.description || '', buffs: [] },
            isDead: false
        };
        setPlayer(hero);
        engineRef.current?.spawnEntity(hero);
        setLoading(p => ({ ...p, progress: 100, msg: 'Synchronizing Realities' }));
        setTimeout(() => {
          setLoading(p => ({ ...p, active: false }));
          setGameState(AppState.PLAYING);
        }, 800);
    } catch (e) {
        console.error(e);
        setLoading(p => ({ ...p, active: false }));
        setGameState(AppState.CHARACTER_GEN);
    }
  };

  const saveGame = () => {
    if (!world || !player || !engineRef.current) return;
    try {
      const allEntities = engineRef.current.getAllEntities();
      const serializedEntities = allEntities.filter(e => e.type !== 'player').map(e => ({
        ...e,
        position: { x: e.position.x, y: e.position.y, z: e.position.z },
        spawnPosition: e.spawnPosition ? { x: e.spawnPosition.x, y: e.spawnPosition.y, z: e.spawnPosition.z } : undefined,
        mesh: undefined
      }));

      const saveData: SaveData = {
        world,
        player: { 
          ...player, 
          position: { x: player.position.x, y: player.position.y, z: player.position.z },
          mesh: undefined 
        } as any,
        entities: serializedEntities as any,
        timestamp: Date.now()
      };

      localStorage.setItem('gemini_chronicles_save', JSON.stringify(saveData));
      notify("Real-world persistence synchronized.", "#22c55e");
    } catch (e) {
      console.error(e);
      notify("Memory Leak: Failed to synchronize reality.", "#ef4444");
    }
  };

  const loadGame = () => {
    const raw = localStorage.getItem('gemini_chronicles_save');
    if (!raw) {
      notify("Void Space: No saved realities found.", "#f59e0b");
      return;
    }
    setLoading({ active: true, msg: 'Reconstituting Lost Timeline', progress: 10 });
    try {
      const saveData: SaveData = JSON.parse(raw);
      
      // Setup world
      setWorld(saveData.world);
      engineRef.current?.generateWorld(
        saveData.world.chunks!.map((c: any) => ({ ...c, colors: c.type === 'safe' ? saveData.world.palette.safe : saveData.world.palette.hostile })), 
        saveData.world.ambient
      );

      setLoading(p => ({ ...p, progress: 50, msg: 'Recalling Biological Patterns' }));
      
      // Setup player
      const heroPos = new THREE.Vector3(saveData.player.position.x, saveData.player.position.y, saveData.player.position.z);
      const hero: GameEntity = {
        ...saveData.player,
        id: 'player_loaded_' + Date.now(), // New ID to ensure clean re-initialization
        position: heroPos,
        rotation: saveData.player.rotation,
        isDead: saveData.player.isDead
      } as any;
      setPlayer(hero);
      
      engineRef.current?.clearEntities();
      engineRef.current?.spawnEntity(hero);

      // Setup other entities
      saveData.entities.forEach(e => {
        engineRef.current?.spawnEntity({
          ...e,
          position: new THREE.Vector3(e.position.x, e.position.y, e.position.z),
          spawnPosition: e.spawnPosition ? new THREE.Vector3(e.spawnPosition.x, e.spawnPosition.y, e.spawnPosition.z) : undefined,
        } as any);
      });

      setLoading(p => ({ ...p, progress: 100, msg: 'Reality Restored' }));
      setTimeout(() => {
        setLoading(p => ({ ...p, active: false }));
        setGameState(AppState.PLAYING);
      }, 1000);

    } catch (e) {
      console.error(e);
      setLoading(p => ({ ...p, active: false }));
      setError("Timeline Corruption: Save data is unreadable.");
      setGameState(AppState.WIZARD);
    }
  };

  const handleJoystickStart = (e: any) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    joystickRef.current = { active: true, start: { x, y } };
  };

  const handleJoystickMove = (e: any) => {
    if (!joystickRef.current.active) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = x - joystickRef.current.start.x, dy = y - joystickRef.current.start.y;
    const d = Math.sqrt(dx*dx + dy*dy), max = 50, s = d > max ? max/d : 1;
    setJoystickOffset({ x: dx * s, y: dy * s });
  };

  const handleJoystickEnd = () => {
    joystickRef.current.active = false;
    setJoystickOffset({ x: 0, y: 0 });
    engineRef.current?.setInputDirection(new THREE.Vector3(0,0,0));
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden" onMouseMove={handleJoystickMove} onMouseUp={handleJoystickEnd} onTouchMove={handleJoystickMove} onTouchEnd={handleJoystickEnd}>
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-crosshair" />
      
      {gameState === AppState.WIZARD && <Wizard onComplete={initWorld} onLoadRequest={loadGame} />}
      
      {gameState === AppState.CHARACTER_GEN && !loading.active && (
        <PromptModal isOpen mode="create" onClose={()=>{}} onSubmit={createHero} />
      )}

      {loading.active && (
          <LoadingScreen message={loading.msg} progress={loading.progress} />
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] bg-red-500/90 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 text-white font-black text-sm border-2 border-red-400 animate-in slide-in-from-top-4">
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError(null)} className="ml-4 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="absolute top-32 right-12 z-[250] flex flex-col gap-2">
           {notifications.map(n => (
             <div key={n.id} style={{ color: n.color, borderColor: n.color + '44' }} className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-widest animate-in slide-in-from-right-4 fade-in">
               {n.msg}
             </div>
           ))}
        </div>
      )}

      {gameState === AppState.PLAYING && player && (
          <>
            <HUD player={player} worldName={world?.name || "The Void"} onSkillUse={executeSkill} onSave={saveGame} onLoad={loadGame} />
            
            {!isLocked && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-indigo-600/90 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 animate-pulse pointer-events-none shadow-2xl border-2 border-indigo-400">
                <MousePointer2 size={24} /> CLICK TO LOOK AROUND
              </div>
            )}

            <div className="absolute bottom-12 left-12 z-50 pointer-events-auto group">
                <div 
                  className="w-32 h-32 rounded-full bg-slate-900/60 backdrop-blur-md border-2 border-slate-700 flex items-center justify-center touch-none transition-transform group-hover:scale-105" 
                  onMouseDown={handleJoystickStart} onTouchStart={handleJoystickStart}
                >
                    <div className="w-12 h-12 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white transition-transform" style={{ transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)` }}><Move size={20} /></div>
                </div>
            </div>

            {player.isDead && (
                <div className="absolute inset-0 z-[300] bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center">
                    <h2 className="text-7xl font-black text-white mb-2 tracking-tighter">HERO FALLEN</h2>
                    <p className="text-red-400 font-bold uppercase tracking-[0.4em] mb-12">The multiverse sequence has terminated.</p>
                    <button onClick={()=>window.location.reload()} className="px-12 py-5 bg-white text-red-950 font-black rounded-3xl shadow-2xl hover:bg-red-50 transition-all active:scale-95 text-xl">REAWAKEN CORE</button>
                </div>
            )}
          </>
      )}
    </div>
  );
};

const HUD = ({ player, worldName, onSkillUse, onSave, onLoad }: any) => {
    const hpPercent = (player.stats.hp / player.stats.maxHp) * 100;
    
    let powerBonus = 0;
    let speedBonus = 0;
    let defBonus = 0;
    player.stats.buffs?.forEach((b: any) => {
      if (b.type === 'power') powerBonus += b.amount;
      if (b.type === 'speed') speedBonus += b.amount;
      if (b.type === 'defense') defBonus += b.amount;
    });

    return (
        <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-6 rounded-[2.5rem] min-w-[320px] pointer-events-auto shadow-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{worldName}</span>
                      <div className="flex items-center gap-2">
                         <button onClick={onSave} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Save Universe"><Save size={14}/></button>
                         <button onClick={onLoad} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Load Universe"><FolderOpen size={14}/></button>
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase ml-2"><Info size={10} /> Live Simulation</div>
                      </div>
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">{player.stats.class}</h2>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                        <div 
                          className={`h-full transition-all duration-700 ease-out ${hpPercent < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-red-600 to-red-400'}`} 
                          style={{ width: `${Math.max(0, hpPercent)}%` }} 
                        />
                    </div>
                    <div className="flex gap-4 mt-6">
                        <Stat icon={<Sword size={12}/>} label="POW" value={player.stats.power} bonus={powerBonus} color="orange" />
                        <Stat icon={<Shield size={12}/>} label="DEF" value={player.stats.defense} bonus={defBonus} color="slate" />
                        <Stat icon={<Zap size={12}/>} label="SPD" value={player.stats.speed} bonus={speedBonus} color="cyan" />
                    </div>
                    
                    {player.stats.buffs?.length > 0 && (
                      <div className="mt-6 flex gap-2">
                        {player.stats.buffs.map((b: any, i: number) => (
                           <div key={i} className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-indigo-500/20">
                              <Sparkles size={10} className="text-indigo-400" />
                              <span className="text-[8px] font-black text-white uppercase">{b.type}</span>
                           </div>
                        ))}
                      </div>
                    )}
                </div>
            </div>
            <div className="flex justify-center gap-6 items-end pb-4">
                {player.stats.skills?.map((s:any, i:number) => (
                    <button 
                      key={i} 
                      onClick={()=>onSkillUse(i)} 
                      className="bg-slate-900/95 border-2 border-slate-700 p-5 rounded-[2.5rem] w-64 pointer-events-auto hover:border-indigo-500 hover:-translate-y-2 transition-all text-left shadow-2xl group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-center mb-3">
                            <span className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-black text-white group-hover:bg-indigo-600 transition-colors">{i+1}</span>
                            <span 
                              className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-500/30 text-indigo-400"
                              style={{ color: s.vfxColor, borderColor: s.vfxColor + '44' }}
                            >
                                {s.damage + (powerBonus * 0.5)} POWER
                            </span>
                        </div>
                        <h3 className="text-white font-black text-sm uppercase mb-1">{s.name}</h3>
                        <p className="text-[9px] text-slate-500 uppercase font-bold leading-tight group-hover:text-slate-300 transition-colors">{s.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Stat = ({icon, label, value, bonus, color}: any) => (
    <div className={`flex flex-col flex-1 items-center justify-center bg-slate-800/40 p-2.5 rounded-2xl border border-slate-700/50 transition-all ${bonus > 0 ? 'ring-2 ring-indigo-500/50' : ''}`}>
        <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
            {icon}
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <div className="text-sm font-black text-white">{value}</div>
          {bonus > 0 && <div className="text-[10px] font-black text-green-400">+{bonus}</div>}
        </div>
    </div>
);

export default App;
