import React from 'react';
import { PlanOption, Tier } from './AuthView.types';

interface AuthSignupPlanSectionProps {
  plans: PlanOption[];
  selectedTier: Tier;
  setSelectedTier: (tier: Tier) => void;
  effectiveSeatCount: number | null;
  selectedPlanLabel: string;
  onSeatCountChange: (seatCount: number) => void;
}

const AuthSignupPlanSection: React.FC<AuthSignupPlanSectionProps> = ({
  plans,
  selectedTier,
  setSelectedTier,
  effectiveSeatCount,
  selectedPlanLabel,
  onSeatCountChange
}) => (
  <>
    <div>
      <label className="mb-2 block text-xs text-slate-500">Plan</label>
      <div className="grid gap-2">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelectedTier(plan.id)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
              selectedTier === plan.id ? 'border-[#76003f] bg-[#76003f] text-white' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{plan.label}</p>
              <p className={`text-xs ${selectedTier === plan.id ? 'text-slate-200' : 'text-slate-500'}`}>
                {plan.price > 0 ? `$${plan.price}/user` : 'Free'}
              </p>
            </div>
            <p className={`text-xs mt-1 ${selectedTier === plan.id ? 'text-slate-200' : 'text-slate-500'}`}>
              {plan.id === 'free' ? 'Up to 3 licenses' : 'Feature-based plan (no seat cap)'}
            </p>
          </button>
        ))}
      </div>
    </div>
    {selectedTier === 'free' ? (
      <div>
        <label className="mb-1.5 block text-xs text-slate-500">Licenses (seats)</label>
        <input
          type="number"
          min={1}
          max={3}
          step={1}
          value={effectiveSeatCount || 3}
          onChange={(e) => onSeatCountChange(Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300"
        />
        <p className="mt-1.5 text-xs text-slate-500">Free plan allows up to 3 licenses.</p>
      </div>
    ) : (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {selectedPlanLabel} is feature-based. License capacity is managed by your workspace plan.
      </p>
    )}
  </>
);

export default AuthSignupPlanSection;
