import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Project, Task } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onSelectProject: (id: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  onSelectTask,
  onSelectProject
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();
  const taskResults = tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6);
  const projectResults = projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-start justify-center pt-0 md:pt-12 px-0 md:px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl h-[100dvh] md:h-auto bg-white border border-slate-200 rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
        <div className="relative border-b border-slate-200">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks or projects..."
            className="w-full h-12 pl-11 pr-4 text-sm outline-none"
          />
        </div>

        <div className="flex-1 min-h-0 md:max-h-[52vh] overflow-y-auto custom-scrollbar p-3 space-y-4">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-2 mb-2">Tasks</p>
            <div className="space-y-1">
              {taskResults.length === 0 && <p className="text-sm text-slate-500 px-2 py-1.5">No matching tasks.</p>}
              {taskResults.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    onSelectTask(task);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
                >
                  <span className="text-sm text-slate-800 truncate">{task.title}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-2 mb-2">Projects</p>
            <div className="space-y-1">
              {projectResults.length === 0 && <p className="text-sm text-slate-500 px-2 py-1.5">No matching projects.</p>}
              {projectResults.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
                >
                  <span className="text-sm text-slate-800 truncate">{project.name}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
