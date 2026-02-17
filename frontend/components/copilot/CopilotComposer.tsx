import React from 'react';
import { Loader2, Mic, MicOff, RotateCcw, Send } from 'lucide-react';

interface CopilotComposerProps {
  query: string;
  setQuery: (value: string) => void;
  suggestedPrompts: string[];
  isLoading: boolean;
  canChat: boolean;
  isRecording: boolean;
  isRecorderSupported: boolean;
  audioUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onAsk: (preset?: string) => void;
  onToggleRecording: () => void;
  onClearVoice: () => void;
}

const CopilotComposer: React.FC<CopilotComposerProps> = ({
  query,
  setQuery,
  suggestedPrompts,
  isLoading,
  canChat,
  isRecording,
  isRecorderSupported,
  audioUrl,
  inputRef,
  onAsk,
  onToggleRecording,
  onClearVoice
}) => {
  return (
    <div className="p-3 border-t border-slate-200 bg-white space-y-2">
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-slate-500">Suggested prompts</p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onAsk(prompt)}
              disabled={isLoading || !canChat}
              className="shrink-0 h-7 px-2.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
      {audioUrl ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <audio controls src={audioUrl} className="w-full h-9" />
        </div>
      ) : null}
      {!isRecorderSupported ? <p className="text-[10px] text-rose-600">Audio recording is not supported in this browser.</p> : null}
      <div className="flex gap-2">
        <form onSubmit={(e) => { e.preventDefault(); onAsk(); }} className="flex-1 flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Copilot about risk, delivery, priorities, or actions..."
            className="flex-1 h-10 rounded-lg border border-slate-300 px-3 text-[13px] outline-none focus:ring-2 focus:ring-slate-300"
            disabled={isLoading || !canChat}
          />
          <button type="submit" disabled={isLoading || !query.trim() || !canChat} className="w-10 h-10 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <button
          onClick={onToggleRecording}
          disabled={isLoading}
          className={`w-10 h-10 rounded-lg border flex items-center justify-center ${isRecording ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          onClick={onClearVoice}
          className="w-10 h-10 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center"
          title="Clear voice"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CopilotComposer;
