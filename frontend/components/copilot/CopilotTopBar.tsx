import React from 'react';
import { Bot, X } from 'lucide-react';
import { Project } from '../../types';

interface CopilotTopBarProps {
  projects: Project[];
  resolvedContextLabel: string;
  contextSelectableValue: string;
  showDiagnostics?: boolean;
  onChangeContext: (value: string | 'all') => void;
  onToggleDiagnostics?: () => void;
  onClose: () => void;
}

const CopilotTopBar: React.FC<CopilotTopBarProps> = ({
  projects,
  resolvedContextLabel,
  contextSelectableValue,
  showDiagnostics = false,
  onChangeContext,
  onToggleDiagnostics,
  onClose
}) => {
  return (
    <div className="h-12 px-2.5 md:px-4 border-b border-slate-200 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleDiagnostics}
          title="Toggle diagnostics (Cmd/Ctrl+Shift+D)"
          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"
        >
          <Bot className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold">Velo Copilot</h2>
          <p className="text-[10px] text-slate-500 inline-flex items-center gap-1.5 max-w-[120px] md:max-w-none">
            <span className="truncate">{resolvedContextLabel}</span>
            {showDiagnostics ? <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 text-[9px] text-emerald-700">Diagnostics</span> : null}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={contextSelectableValue}
          onChange={(event) => onChangeContext(event.target.value as string | 'all')}
          className="h-8 w-[132px] sm:w-[180px] rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CopilotTopBar;
