import React from 'react';
import DateInputField from '../../ui/DateInputField';
import { SidebarProjectEditModalProps } from './SidebarProjectEditModal.types';

const PROJECT_COLORS = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-violet-500', 'bg-slate-700'];

type SidebarProjectEditModalBodyProps = Pick<
  SidebarProjectEditModalProps,
  | 'allUsers'
  | 'budgetCost'
  | 'color'
  | 'currentUser'
  | 'description'
  | 'endDate'
  | 'hourlyRate'
  | 'isPublic'
  | 'name'
  | 'ownerId'
  | 'scopeSize'
  | 'scopeSummary'
  | 'setBudgetCost'
  | 'setColor'
  | 'setDescription'
  | 'setEndDate'
  | 'setHourlyRate'
  | 'setIsPublic'
  | 'setName'
  | 'setOwnerId'
  | 'setScopeSize'
  | 'setScopeSummary'
  | 'setStartDate'
  | 'startDate'
>;

const SidebarProjectEditModalBody: React.FC<SidebarProjectEditModalBodyProps> = ({
  allUsers,
  budgetCost,
  color,
  currentUser,
  description,
  endDate,
  hourlyRate,
  isPublic,
  name,
  ownerId,
  scopeSize,
  scopeSummary,
  setBudgetCost,
  setColor,
  setDescription,
  setEndDate,
  setHourlyRate,
  setIsPublic,
  setName,
  setOwnerId,
  setScopeSize,
  setScopeSummary,
  setStartDate,
  startDate
}) => {
  const canChangeOwner = currentUser.role === 'admin';
  const ownerDisplay = allUsers.find((user) => user.id === ownerId)?.displayName || 'Unknown owner';

  return (
    <div className="p-4 overflow-y-auto custom-scrollbar space-y-4 flex-1 min-h-0 md:max-h-[70vh]">
      <label className="block">
        <p className="text-[11px] text-slate-500 mb-1">Project name</p>
        <input value={name} onChange={(event) => setName(event.target.value)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
      </label>

      <label className="block">
        <p className="text-[11px] text-slate-500 mb-1">Description</p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
      </label>

      <div>
        <p className="text-[11px] text-slate-500 mb-1.5">Color</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((projectColor) => (
            <button
              key={projectColor}
              onClick={() => setColor(projectColor)}
              className={`w-7 h-7 rounded-full border-2 ${projectColor} ${color === projectColor ? 'border-slate-900' : 'border-transparent'}`}
              title={projectColor}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <p className="text-[11px] text-slate-500 mb-1">Start date</p>
          <DateInputField value={startDate} onChange={setStartDate} />
        </label>
        <label className="block">
          <p className="text-[11px] text-slate-500 mb-1">End date</p>
          <DateInputField value={endDate} onChange={setEndDate} />
        </label>
        <label className="block">
          <p className="text-[11px] text-slate-500 mb-1">Budget cost</p>
          <input
            type="number"
            min={0}
            value={budgetCost}
            onChange={(event) => setBudgetCost(event.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="block">
          <p className="text-[11px] text-slate-500 mb-1">Hourly rate ($/h)</p>
          <input
            type="number"
            min={0}
            value={hourlyRate}
            onChange={(event) => setHourlyRate(event.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="block">
          <p className="text-[11px] text-slate-500 mb-1">Scope size</p>
          <input
            type="number"
            min={0}
            value={scopeSize}
            onChange={(event) => setScopeSize(event.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
      </div>

      <label className="block">
        <p className="text-[11px] text-slate-500 mb-1">Scope summary</p>
        <textarea
          value={scopeSummary}
          onChange={(event) => setScopeSummary(event.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-700">Public project</p>
            <p className="text-[11px] text-slate-500">Allow read-only public sharing.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`w-11 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-slate-900' : 'bg-slate-300'}`}
            title={isPublic ? 'Disable public read-only sharing' : 'Enable public read-only sharing'}
          >
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] text-slate-500 mb-1">Project owner</p>
        {canChangeOwner ? (
          <select
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          >
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        ) : (
          <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center">{ownerDisplay}</div>
        )}
      </div>
    </div>
  );
};

export default SidebarProjectEditModalBody;
