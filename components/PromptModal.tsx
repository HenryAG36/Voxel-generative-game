
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { Sparkles, Wand2, ArrowRight } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  mode: 'create' | 'morph';
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onSubmit }) => {
  const [prompt, setPrompt] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl animate-in zoom-in-95 fade-in duration-300">
        <div className="text-center mb-8">
            <div className="inline-block p-4 bg-amber-500/10 rounded-3xl mb-4 border border-amber-500/20">
                <Wand2 className="text-amber-400" size={40} />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Choose Your Form</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">The AI will manifest your destiny</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A winged celestial knight, a heavy iron golem, a swift phoenix..."
            className="w-full h-40 bg-slate-800/50 border-2 border-slate-700 focus:border-amber-500 rounded-3xl px-6 py-6 text-white font-bold outline-none resize-none transition-all placeholder:text-slate-600 mb-6"
            autoFocus
          />

          <button 
            onClick={() => onSubmit(prompt)}
            disabled={!prompt.trim()}
            className="w-full py-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
          >
            MANIFEST AVATAR <Sparkles size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
