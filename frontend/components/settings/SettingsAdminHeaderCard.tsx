import React from 'react';
import { ArrowUpRight, ShieldCheck, UserPlus, Users } from 'lucide-react';
import Button from '../ui/Button';

interface SettingsAdminHeaderCardProps {
  planLabel: string;
  seatLimit: number;
  usedSeats: number;
  availableSeats: number;
  canAddSeats: boolean;
  canUpgradePlan: boolean;
  onOpenAddSeatsModal: () => void;
  onOpenUpgradeModal: () => void;
  onOpenProvisionPanel: () => void;
}

const SettingsAdminHeaderCard: React.FC<SettingsAdminHeaderCardProps> = (props) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-900"><ShieldCheck className="h-4 w-4" /> {props.planLabel}</span>
        <p className="text-xs text-slate-700"><span className="font-semibold text-slate-900">{props.usedSeats}</span> / {props.seatLimit} licensed • {props.availableSeats} available</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {props.canAddSeats ? (
          <Button size="sm" variant="outline" onClick={props.onOpenAddSeatsModal}>
            <Users className="mr-1.5 h-3.5 w-3.5" /> Add licenses
          </Button>
        ) : null}
        {props.canUpgradePlan ? (
          <Button size="sm" variant="outline" onClick={props.onOpenUpgradeModal}>
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Upgrade plan
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={props.onOpenProvisionPanel}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add user</Button>
      </div>
    </div>
  </div>
);

export default SettingsAdminHeaderCard;
