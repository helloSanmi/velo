import React, { useEffect, useState } from 'react';
import { Check, GripVertical, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import Button from './ui/Button';

interface AIModalProps {
  suggestions: string[] | null;
  onClose: () => void;
  onApply: (finalSteps: string[]) => void;
  isLoading: boolean;
  taskTitle: string;
}

const AIModal: React.FC<AIModalProps> = ({ suggestions, onClose, onApply, isLoading, taskTitle }) => {
  const [editedSteps, setEditedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (suggestions) setEditedSteps([...suggestions]);
  }, [suggestions]);

  if (!suggestions && !isLoading) return null;

  const updateStep = (index: number, value: string) => {
    const next = [...editedSteps];
    next[index] = value;
    setEditedSteps(next);
  };

  const removeStep = (index: number) => {
    setEditedSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setEditedSteps((prev) => [...prev, '']);
  };

  const apply = () => {
    const valid = editedSteps.filter((s) => s.trim());
    if (valid.length === 0) return;
    onApply(valid);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-none md:rounded-xl shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[86vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700"><Sparkles className="w-4 h-4" /></div>
            <div>
              <h2 className="text-sm font-semibold">AI Suggestions</h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[360px]">{taskTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3.5 md:p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {isLoading ? (
            <div className="h-52 flex items-center justify-center text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating suggestions...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[52vh] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {editedSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <input
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      className="flex-1 h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Step"
                    />
                    <button onClick={() => removeStep(index)} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-700 flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={addStep} className="w-full h-10 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add step
              </button>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
                <Button className="flex-1" onClick={apply} disabled={editedSteps.filter((s) => s.trim()).length === 0}>
                  <Check className="w-4 h-4 mr-2" /> Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIModal;
