
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { AppState, SavedModel, EntityStats } from '../types';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, Hammer, FolderOpen, ChevronUp, FileJson, History, Play, Pause, Info, Wrench, Loader2, Shield, Zap, Sword, ScrollText } from 'lucide-react';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentStats: EntityStats | null;
  currentBaseModel: string;
  customBuilds: SavedModel[];
  customRebuilds: SavedModel[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  onDismantle: () => void;
  onRebuild: (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => void;
  onNewScene: (type: 'Eagle') => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onSelectCustomRebuild: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onPromptMorph: () => void;
  onShowJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
}

const LOADING_MESSAGES = ["Summoning Entity...", "Generating Stats...", "Forging Voxels...", "Calculating Power...", "Balancing Traits..."];

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount, appState, currentStats, currentBaseModel, customBuilds, customRebuilds, isAutoRotate, isInfoVisible, isGenerating,
  onDismantle, onRebuild, onNewScene, onSelectCustomBuild, onSelectCustomRebuild, onPromptCreate, onPromptMorph, onShowJson, onImportJson, onToggleRotation, onToggleInfo
}) => {
  const isStable = appState === AppState.STABLE;
  const isDismantling = appState === AppState.DISMANTLING;
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (isGenerating) {
        const interval = setInterval(() => setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length), 2000);
        return () => clearInterval(interval);
    }
  }, [isGenerating]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
      
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div className="pointer-events-auto flex flex-col gap-2">
            <DropdownMenu icon={<FolderOpen size={20} />} label="Library" color="indigo">
                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">PRESETS</div>
                <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Standard Eagle" />
                <DropdownItem onClick={onPromptCreate} icon={<Wand2 size={16}/>} label="Generate Entity" highlight />
                <div className="h-px bg-slate-100 my-1" />
                {customBuilds.length > 0 && (
                    <>
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">YOUR ENTITIES</div>
                        {customBuilds.map((model, idx) => (
                            <DropdownItem key={`build-${idx}`} onClick={() => onSelectCustomBuild(model)} icon={<History size={16}/>} label={model.name} truncate />
                        ))}
                    </>
                )}
            </DropdownMenu>

            <div className="flex items-center gap-3 px-4 py-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-xl border border-slate-200 text-slate-500 font-bold w-fit mt-2">
                <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Box size={16} strokeWidth={3} /></div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase tracking-wider opacity-60">Voxels</span>
                    <span className="text-lg text-slate-800 font-extrabold font-mono">{voxelCount}</span>
                </div>
            </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
            <TactileButton onClick={onToggleInfo} color={isInfoVisible ? 'indigo' : 'slate'} icon={<Info size={18} />} label="Info" compact />
            <TactileButton onClick={onToggleRotation} color={isAutoRotate ? 'sky' : 'slate'} icon={isAutoRotate ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} label="Cam" compact />
            <TactileButton onClick={onShowJson} color="slate" icon={<Code2 size={18} />} label="Export" />
        </div>
      </div>

      {/* Entity Card */}
      {currentStats && isStable && (
          <div className="absolute right-4 top-24 w-72 pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-500">
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-indigo-100 overflow-hidden">
                  <div className="bg-indigo-600 p-4 text-white">
                      <h3 className="text-xl font-black uppercase tracking-tight">{currentBaseModel}</h3>
                      <span className="text-xs font-bold opacity-80 uppercase tracking-widest">{currentStats.class}</span>
                  </div>
                  <div className="p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                          <StatItem icon={<Shield size={14}/>} label="HP" value={currentStats.hp} color="emerald" />
                          <StatItem icon={<Zap size={14}/>} label="SPD" value={currentStats.speed} color="sky" />
                          <StatItem icon={<Sword size={14}/>} label="ATK" value={currentStats.power} color="rose" />
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="flex items-center gap-2 mb-1 text-slate-400">
                              <ScrollText size={12} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Lore / Description</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold italic">
                              "{currentStats.description}"
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Loading */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300 text-center">
              <div className="bg-white/90 backdrop-blur-md border-2 border-indigo-100 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                  <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  <div>
                      <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">AI Engine Busy...</h3>
                      <p className="text-indigo-500 font-bold text-sm">{LOADING_MESSAGES[loadingMsgIndex]}</p>
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-end pointer-events-none">
        <div className="pointer-events-auto">
            {isStable && (
                 <div className="animate-in slide-in-from-bottom-10 fade-in">
                     <BigActionButton onClick={onDismantle} icon={<Hammer size={32} />} label="BREAK" color="rose" />
                 </div>
            )}
            {isDismantling && !isGenerating && (
                <DropdownMenu icon={<Wrench size={24} />} label="Rebuild" color="emerald" direction="up" big>
                    <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">RESTORE</div>
                    {currentBaseModel === 'Eagle' && (
                        <>
                            <DropdownItem onClick={() => onRebuild('Cat')} icon={<Cat size={18}/>} label="Cat" />
                            <DropdownItem onClick={() => onRebuild('Rabbit')} icon={<Rabbit size={18}/>} label="Rabbit" />
                        </>
                    )}
                    {customRebuilds.map((model, idx) => (
                        <DropdownItem key={`rebuild-${idx}`} onClick={() => onSelectCustomRebuild(model)} icon={<History size={18}/>} label={model.name} truncate />
                    ))}
                    <div className="h-px bg-slate-100 my-1" />
                    <DropdownItem onClick={onPromptMorph} icon={<Zap size={18}/>} label="Evolve Model" highlight />
                </DropdownMenu>
            )}
        </div>
      </div>
    </div>
  );
};

const StatItem = ({icon, label, value, color}: any) => (
    <div className={`flex flex-col items-center justify-center p-2 rounded-xl bg-${color}-50 border border-${color}-100`}>
        <div className={`text-${color}-600 mb-1`}>{icon}</div>
        <div className={`text-[10px] font-black text-${color}-600/60 uppercase leading-none`}>{label}</div>
        <div className={`text-sm font-black text-slate-800`}>{value}</div>
    </div>
);

const TactileButton = ({ onClick, disabled, icon, label, color, compact }: any) => {
  const colorStyles = {
    slate:   'bg-slate-200 text-slate-600 border-slate-300 shadow-slate-300 hover:bg-slate-300',
    rose:    'bg-rose-500 text-white border-rose-700 shadow-rose-700 hover:bg-rose-600',
    sky:     'bg-sky-500 text-white border-sky-700 shadow-sky-700 hover:bg-sky-600',
    emerald: 'bg-emerald-500 text-white border-emerald-700 shadow-emerald-700 hover:bg-emerald-600',
    amber:   'bg-amber-400 text-amber-900 border-amber-600 shadow-amber-600 hover:bg-amber-500',
    indigo:  'bg-indigo-500 text-white border-indigo-700 shadow-indigo-700 hover:bg-indigo-600',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`group flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] ${compact ? 'p-2.5' : 'px-4 py-3'} ${disabled ? 'opacity-50 grayscale' : colorStyles[color as keyof typeof colorStyles]}`}>
      {icon} {!compact && <span>{label}</span>}
    </button>
  );
};

const BigActionButton = ({ onClick, icon, label }: any) => (
    <button onClick={onClick} className="group flex flex-col items-center justify-center w-32 h-32 rounded-3xl bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-900/30 border-b-[8px] border-rose-800 active:border-b-0 active:translate-y-[8px] transition-all">
        <div className="mb-2">{icon}</div>
        <div className="text-sm font-black tracking-wider">{label}</div>
    </button>
);

const DropdownMenu = ({ icon, label, children, color, direction = 'down', big }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: any) => menuRef.current && !menuRef.current.contains(e.target) && setIsOpen(false);
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const bgClass = color === 'indigo' ? 'bg-indigo-500 hover:bg-indigo-600 border-indigo-800' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-800';
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 font-bold text-white shadow-lg rounded-2xl transition-all active:scale-95 ${bgClass} ${big ? 'px-8 py-4 text-lg border-b-[6px] active:border-b-0 active:translate-y-[6px]' : 'px-4 py-3 text-sm border-b-[4px] active:border-b-0 active:translate-y-[4px]'}`}>
                {icon} {label} <ChevronUp size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${direction === 'down' ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className={`absolute left-0 ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-3'} w-56 max-h-[60vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-slate-100 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in`}>{children}</div>}
        </div>
    );
};

const DropdownItem = ({ onClick, icon, label, highlight, truncate }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors text-left ${highlight ? 'bg-sky-50 text-sky-600 hover:bg-sky-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <div className="shrink-0">{icon}</div><span className={truncate ? "truncate w-full" : ""}>{label}</span>
    </button>
);
