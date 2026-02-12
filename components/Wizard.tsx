
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Globe, BookOpen, Sparkles, Map, ArrowRight, History } from 'lucide-react';

interface WizardProps {
  onComplete: (data: { name: string; ambient: string; lore: string }) => void;
  onLoadRequest: () => void;
}

export const Wizard: React.FC<WizardProps> = ({ onComplete, onLoadRequest }) => {
  const [name, setName] = useState('');
  const [ambient, setAmbient] = useState('Cyberpunk Forest');
  const [lore, setLore] = useState('');
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const save = localStorage.getItem('gemini_chronicles_save');
    if (save) setHasSave(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 font-sans overflow-y-auto">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-12">
            <div className="inline-block p-4 bg-indigo-500/10 rounded-3xl mb-4 border border-indigo-500/20">
                <Globe className="text-indigo-400" size={48} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2">GEMINI CHRONICLES</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em]">Procedural World Architect</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest ml-1">
              <Map size={14} /> World Name
            </label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Neon Nexus"
              className="w-full bg-slate-800/50 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl px-6 py-4 text-white font-bold outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest ml-1">
              <Sparkles size={14} /> Ambient / Theme
            </label>
            <select 
              value={ambient}
              onChange={(e) => setAmbient(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl px-6 py-4 text-white font-bold outline-none appearance-none cursor-pointer"
            >
              <option>Cyberpunk Forest</option>
              <option>Steam-Powered Tundra</option>
              <option>Magical Oceanic Ruins</option>
              <option>Floating Sky Citadel</option>
              <option>Void Desert</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest ml-1">
              <BookOpen size={14} /> Ancient Lore (Optional)
            </label>
            <textarea 
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              placeholder="Describe the mood or history... or leave it to Gemini."
              className="w-full h-32 bg-slate-800/50 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl px-6 py-4 text-white font-bold outline-none resize-none transition-all"
            />
          </div>

          <div className="flex gap-4">
            {hasSave && (
              <button 
                onClick={onLoadRequest}
                className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group border-2 border-slate-700"
              >
                RESUME LAST REALITY <History size={20} />
              </button>
            )}
            <button 
              onClick={() => onComplete({ name, ambient, lore })}
              disabled={!name.trim()}
              className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
              INITIALIZE UNIVERSE <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
