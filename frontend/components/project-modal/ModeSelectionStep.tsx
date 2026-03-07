import React from 'react';
import { Mode } from './types';
import { ensureAiAccess } from '../../services/aiAccessService';
import { toastService } from '../../services/toastService';

interface ModeSelectionStepProps {
  onSelectMode: (mode: Mode) => void;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
  allowAiMode?: boolean;
}

const ModeSelectionStep: React.FC<ModeSelectionStepProps> = ({ onSelectMode, aiPlanEnabled = true, aiEnabled = true, allowAiMode = true }) => {
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
        <button
          onClick={() => {
            if (!allowAiMode) {
              const allowed = ensureAiAccess({
                aiPlanEnabled,
                aiEnabled,
                featureLabel: 'AI project generation'
              });
              if (allowed) toastService.info('AI unavailable', 'AI project generation is currently unavailable.');
              return;
            }
            onSelectMode('ai');
          }}
          className={`p-3 rounded-lg border text-sm ${
            allowAiMode ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {allowAiMode ? 'Generate with AI' : !aiPlanEnabled ? 'Generate with AI (Pro)' : 'Generate with AI (Enable AI)'}
        </button>
      </div>
    </div>
  );
};

export default ModeSelectionStep;
