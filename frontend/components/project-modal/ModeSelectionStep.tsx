import React from 'react';
import { Mode } from './types';

interface ModeSelectionStepProps {
  onSelectMode: (mode: Mode) => void;
  allowAiMode?: boolean;
}

const ModeSelectionStep: React.FC<ModeSelectionStepProps> = ({ onSelectMode, allowAiMode = true }) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Choose how to start:</p>
      <div className="grid sm:grid-cols-3 gap-2">
        <button onClick={() => onSelectMode('manual')} className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-700">
          Start from scratch
        </button>
        <button onClick={() => onSelectMode('template')} className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-700">
          Use template
        </button>
        {allowAiMode ? (
          <button onClick={() => onSelectMode('ai')} className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-700">
            Generate with AI
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ModeSelectionStep;
