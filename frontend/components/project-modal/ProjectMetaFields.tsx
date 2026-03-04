import React from 'react';
import DateInputField from '../ui/DateInputField';

interface ProjectMetaFieldsProps {
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  budgetCost: string;
  setBudgetCost: (value: string) => void;
  hourlyRate: string;
  setHourlyRate: (value: string) => void;
  scopeSize: string;
  setScopeSize: (value: string) => void;
  scopeSummary: string;
  setScopeSummary: (value: string) => void;
  metaError: string;
  clearMetaError: () => void;
}

const ProjectMetaFields: React.FC<ProjectMetaFieldsProps> = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  budgetCost,
  setBudgetCost,
  hourlyRate,
  setHourlyRate,
  scopeSize,
  setScopeSize,
  scopeSummary,
  setScopeSummary,
  metaError,
  clearMetaError
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Start date</label>
          <DateInputField
            value={startDate}
            onChange={(value) => {
              setStartDate(value);
              if (value && !endDate) {
                const base = new Date(value);
                base.setDate(base.getDate() + 30);
                setEndDate(base.toISOString().split('T')[0]);
              }
              if (metaError) clearMetaError();
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">End date</label>
          <DateInputField
            value={endDate}
            min={startDate || undefined}
            onChange={(value) => {
              setEndDate(value);
              if (metaError) clearMetaError();
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Planned cost ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={budgetCost}
            onChange={(e) => {
              setBudgetCost(e.target.value);
              if (metaError) clearMetaError();
            }}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Hourly rate ($/hour, optional)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={hourlyRate}
            onChange={(e) => {
              setHourlyRate(e.target.value);
              if (metaError) clearMetaError();
            }}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="e.g. 85"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Scope size (tasks)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={scopeSize}
            onChange={(e) => {
              setScopeSize(e.target.value);
              if (metaError) clearMetaError();
            }}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="e.g. 40"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1.5">Scope summary</label>
        <textarea
          value={scopeSummary}
          onChange={(e) => {
            setScopeSummary(e.target.value);
            if (metaError) clearMetaError();
          }}
          className="w-full min-h-[72px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="What is in scope and what is out of scope?"
        />
      </div>
    </>
  );
};

export default ProjectMetaFields;
