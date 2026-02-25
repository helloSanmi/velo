import React from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import Button from '../ui/Button';

interface SettingsAdminHeaderCardProps {
  planLabel: string;
  isFreePlan: boolean;
  seatLimit: number;
  usedSeats: number;
  availableSeats: number;
  canShowUpgrade: boolean;
  seatPurchaseCount: number;
  setSeatPurchaseCount: (value: number) => void;
  handleBuyMoreSeats: () => void;
  onOpenProvisionPanel: () => void;
}

const SettingsAdminHeaderCard: React.FC<SettingsAdminHeaderCardProps> = (props) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-900"><ShieldCheck className="h-4 w-4" /> {props.planLabel}</span>
        <p className="text-xs text-slate-700"><span className="font-semibold text-slate-900">{props.usedSeats}</span>{props.isFreePlan ? ` / ${props.seatLimit}` : ''} licensed{props.isFreePlan ? ` • ${props.availableSeats} available` : ''}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {props.canShowUpgrade ? (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1">
            <input type="number" min={1} value={props.seatPurchaseCount} onChange={(event) => props.setSeatPurchaseCount(Math.max(1, Number(event.target.value) || 1))} className="h-7 w-16 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none" />
            <Button size="sm" variant="outline" onClick={props.handleBuyMoreSeats}>Add seats</Button>
          </div>
        ) : null}
        <Button size="sm" variant="outline" onClick={props.onOpenProvisionPanel}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add user</Button>
      </div>
    </div>
  </div>
);

export default SettingsAdminHeaderCard;
