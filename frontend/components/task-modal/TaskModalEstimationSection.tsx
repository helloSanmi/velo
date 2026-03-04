import React from 'react';

interface EstimationPreview {
  adjustedMinutes: number;
  explanation: string;
  requiresApproval?: boolean;
}

interface TaskModalEstimationSectionProps {
  estimateHours: string;
  onEstimateHoursChange: (value: string) => void;
  preview: EstimationPreview | null;
  showPersonalCalibration: boolean;
  whatIfPercent: number;
  onWhatIfPercentChange: (value: number) => void;
  whatIfAdjustedMinutes: number;
}

const TaskModalEstimationSection: React.FC<TaskModalEstimationSectionProps> = ({
  estimateHours,
  onEstimateHoursChange,
  preview,
  showPersonalCalibration,
  whatIfPercent,
  onWhatIfPercentChange,
  whatIfAdjustedMinutes
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <label className="block text-xs text-slate-500 mb-1.5">Planned effort (hours)</label>
    <input
      type="number"
      min={0}
      step={0.25}
      value={estimateHours}
      onChange={(e) => onEstimateHoursChange(e.target.value)}
      className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white"
      placeholder="e.g. 8"
    />
    {preview && showPersonalCalibration ? (
      <div className="mt-2.5 space-y-1.5 text-xs">
        <p className="text-slate-700">
          Risk-adjusted plan: <span className="font-semibold">{Math.max(0.25, preview.adjustedMinutes / 60).toFixed(2)}h</span>
          {' '}({preview.explanation})
        </p>
        <div className="flex items-center justify-between gap-3">
          <label className="text-slate-500">Scenario buffer ({whatIfPercent}%)</label>
          <input
            type="range"
            min={-20}
            max={50}
            step={5}
            value={whatIfPercent}
            onChange={(e) => onWhatIfPercentChange(Number(e.target.value))}
            className="w-full md:w-40"
          />
        </div>
        <p className="text-slate-600">
          Scenario result: <span className="font-semibold">{Math.max(0.25, whatIfAdjustedMinutes / 60).toFixed(2)}h</span>
          {preview.requiresApproval ? <span className="ml-2 text-amber-700 font-semibold">Owner/Admin approval required at completion</span> : null}
        </p>
      </div>
    ) : (
      <p className="text-[11px] text-slate-500 mt-2">Add a planned effort estimate to enable forecast calibration.</p>
    )}
  </div>
);

export default TaskModalEstimationSection;
