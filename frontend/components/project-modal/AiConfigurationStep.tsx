import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { AiInputMode } from './types';

interface AiConfigurationStepProps {
  aiInputMode: AiInputMode;
  setAiInputMode: (mode: AiInputMode) => void;
  aiBrief: string;
  setAiBrief: (value: string) => void;
  aiDocText: string;
  setAiDocText: (value: string) => void;
  aiTaskCount: number;
  setAiTaskCount: (value: number) => void;
  isAiProcessing: boolean;
  aiError: string;
  onProcess: () => void;
}

const AiConfigurationStep: React.FC<AiConfigurationStepProps> = ({
  aiInputMode,
  setAiInputMode,
  aiBrief,
  setAiBrief,
  aiDocText,
  setAiDocText,
  aiTaskCount,
  setAiTaskCount,
  isAiProcessing,
  aiError,
  onProcess
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setAiInputMode('brief')}
          className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${aiInputMode === 'brief' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          Brief
        </button>
        <button
          type="button"
          onClick={() => setAiInputMode('document')}
          className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${aiInputMode === 'document' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          Import docs
        </button>
      </div>

      {aiInputMode === 'brief' ? (
        <>
          <p className="text-sm text-slate-600">Describe what this project should deliver. AI will generate a starter task plan.</p>
          <textarea
            value={aiBrief}
            onChange={(event) => setAiBrief(event.target.value)}
            className="w-full min-h-[190px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Example: Build customer onboarding with email verification, profile setup, analytics tracking, and QA sign-off."
          />
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Tasks to generate</label>
            <input
              type="number"
              min={1}
              max={20}
              value={aiTaskCount}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setAiTaskCount(Number.isFinite(nextValue) ? Math.min(20, Math.max(1, nextValue)) : 8);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">Paste notes or documentation. AI will extract tasks.</p>
          <textarea
            value={aiDocText}
            onChange={(event) => setAiDocText(event.target.value)}
            className="w-full min-h-[220px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Paste notes, docs, or task ideas..."
          />
        </>
      )}

      <Button
        onClick={onProcess}
        disabled={isAiProcessing || (aiInputMode === 'brief' ? !aiBrief.trim() : !aiDocText.trim())}
        className="w-full"
      >
        {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {isAiProcessing ? 'Generating tasks...' : 'Generate Tasks with AI'}
      </Button>
      {aiError ? <p className="text-xs text-rose-600">{aiError}</p> : null}
    </div>
  );
};

export default AiConfigurationStep;
