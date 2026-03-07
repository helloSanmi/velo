import React from 'react';
import AppSelect from '../ui/AppSelect';
import { PlanOption, Tier } from './AuthView.types';

interface AuthSignupPlanSectionProps {
  plans: PlanOption[];
  selectedTier: Tier;
  setSelectedTier: (tier: Tier) => void;
  effectiveSeatCount: number;
  selectedPlanLabel: string;
  planLocked: boolean;
  onSeatCountChange: (seatCount: number) => void;
}

const AuthSignupPlanSection: React.FC<AuthSignupPlanSectionProps> = ({
  plans,
  selectedTier,
  setSelectedTier,
  effectiveSeatCount,
  selectedPlanLabel,
  planLocked,
  onSeatCountChange
}) => (
  <>
    <div>
      <label className="mb-2 block text-xs text-slate-500">Plan</label>
      <AppSelect
        value={selectedTier}
        onChange={(value) => setSelectedTier(value as Tier)}
        disabled={planLocked}
        className="h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none"
        options={plans.map((plan) => ({
          value: plan.id,
          label: `${plan.label} · ${plan.price > 0 ? `$${plan.price}/user` : 'Free'}`
        }))}
      />
      <p className="mt-1.5 text-xs text-slate-500">{selectedPlanLabel}: {plans.find((plan) => plan.id === selectedTier)?.seatLabel}</p>
    </div>
    <div>
      <label className="mb-1.5 block text-xs text-slate-500">Licenses (seats)</label>
      <input
        type="number"
        min={1}
        max={selectedTier === 'free' ? 3 : 100000}
        step={1}
        value={effectiveSeatCount}
        onChange={(e) => onSeatCountChange(Number(e.target.value))}
        className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300"
      />
      <p className="mt-1.5 text-xs text-slate-500">
        {selectedTier === 'free'
          ? 'Free plan allows up to 3 licenses.'
          : `${selectedPlanLabel} starts with the number of licenses you choose here.`}
      </p>
    </div>
  </>
);

export default AuthSignupPlanSection;
