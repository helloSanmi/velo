import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, X } from 'lucide-react';
import Button from '../ui/Button';
import { Organization } from '../../types';
import { PLAN_DEFINITIONS, WorkspacePlan, normalizeWorkspacePlan } from '../../services/planFeatureService';

type BillingActionMode = 'add_seats' | 'upgrade_plan';

interface SettingsBillingActionModalProps {
  isOpen: boolean;
  mode: BillingActionMode;
  org: Organization;
  usedSeats: number;
  onClose: () => void;
  onAddSeats: (seatCount: number) => Promise<boolean>;
  onUpgradePlan: (plan: WorkspacePlan, totalSeats: number) => Promise<boolean>;
}

const planOptions: WorkspacePlan[] = ['free', 'basic', 'pro'];
const demoCards = [
  { cardNumber: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' },
  { cardNumber: '5555 5555 5555 4444', expiry: '09/31', cvc: '248' },
  { cardNumber: '4000 0566 5566 5556', expiry: '03/32', cvc: '731' }
];

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const SettingsBillingActionModal: React.FC<SettingsBillingActionModalProps> = ({
  isOpen,
  mode,
  org,
  usedSeats,
  onClose,
  onAddSeats,
  onUpgradePlan
}) => {
  const currentPlan = normalizeWorkspacePlan(org.plan);
  const nextPlanOptions = planOptions.filter((plan) => PLAN_DEFINITIONS[plan].price > PLAN_DEFINITIONS[currentPlan].price);
  const defaultUpgradePlan = nextPlanOptions[0] || currentPlan;

  const [seatCount, setSeatCount] = useState(5);
  const [upgradePlan, setUpgradePlan] = useState<WorkspacePlan>(defaultUpgradePlan);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState<{ title: string; detail: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const demoCard = demoCards[Math.floor(Math.random() * demoCards.length)];
    const defaultSeats = Math.max(1, mode === 'add_seats' ? 5 : Math.max(org.totalSeats, usedSeats, 5));
    setSeatCount(defaultSeats);
    setUpgradePlan(defaultUpgradePlan);
    setCardNumber(demoCard.cardNumber);
    setExpiry(demoCard.expiry);
    setCvc(demoCard.cvc);
    setError('');
    setSuccessState(null);
    setIsSubmitting(false);
  }, [defaultUpgradePlan, isOpen, mode, org.totalSeats, usedSeats]);

  const selectedPlan = PLAN_DEFINITIONS[mode === 'upgrade_plan' ? upgradePlan : currentPlan];
  const seatDelta = mode === 'add_seats' ? Math.max(1, seatCount) : Math.max(Math.max(usedSeats, 1), seatCount);
  const totalSeatsAfterPurchase = mode === 'add_seats' ? org.totalSeats + seatDelta : seatDelta;
  const totalCharge = useMemo(() => {
    if (mode === 'add_seats') return seatDelta * (org.seatPrice || PLAN_DEFINITIONS[currentPlan].price);
    return totalSeatsAfterPurchase * selectedPlan.price;
  }, [currentPlan, mode, org.seatPrice, seatDelta, selectedPlan.price, totalSeatsAfterPurchase]);
  if (!isOpen) return null;

  const title = mode === 'add_seats' ? 'Add licenses' : 'Upgrade plan';
  const validatePayment = () => {
    if (cardNumber.replace(/\s+/g, '').length < 12) return 'Enter a valid card number.';
    if (!expiry.trim()) return 'Expiry date is required.';
    if (cvc.trim().length < 3) return 'CVC is required.';
    return '';
  };

  const handleSubmit = async () => {
    const paymentError = validatePayment();
    if (paymentError) {
      setError(paymentError);
      return;
    }
    setIsSubmitting(true);
    setError('');
    const success =
      mode === 'add_seats'
        ? await onAddSeats(seatDelta)
        : await onUpgradePlan(upgradePlan, totalSeatsAfterPurchase);
    setIsSubmitting(false);
    if (success) {
      setSuccessState({
        title: mode === 'add_seats' ? 'Licenses added' : 'Plan updated',
        detail:
          mode === 'add_seats'
            ? `${seatDelta} licenses added. Capacity is now ${totalSeatsAfterPurchase}.`
            : `${selectedPlan.name} is now active with ${totalSeatsAfterPurchase} licensed users.`
      });
      window.setTimeout(() => onClose(), 1200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-[560px] rounded-[22px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Billing</p>
            <h3 className="mt-1 text-[1.375rem] font-semibold tracking-tight text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'add_seats' ? 'Increase licensed capacity for this workspace.' : 'Choose the plan and licensed user count, then complete payment.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close billing modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_120px_120px]">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {mode === 'upgrade_plan' ? 'Target plan' : 'Additional licenses'}
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {mode === 'upgrade_plan' ? 'Users' : 'Total seats'}
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Total
              </label>

              {mode === 'upgrade_plan' ? (
                <select
                  value={upgradePlan}
                  onChange={(event) => setUpgradePlan(event.target.value as WorkspacePlan)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {nextPlanOptions.map((plan) => (
                    <option key={plan} value={plan}>
                      {PLAN_DEFINITIONS[plan].name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  value={seatCount}
                  onChange={(event) => setSeatCount(Math.max(1, Number(event.target.value) || 1))}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              )}

              <input
                type="number"
                min={1}
                value={seatCount}
                onChange={(event) => setSeatCount(Math.max(1, Number(event.target.value) || 1))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />

              <div className="flex h-10 items-center justify-end rounded-xl border border-slate-300 bg-white px-3 text-right">
                <p className="text-xl font-semibold tracking-tight text-slate-950">{formatMoney(totalCharge)}</p>
              </div>

              <p className="text-xs text-slate-500">
                {mode === 'upgrade_plan' ? `${formatMoney(PLAN_DEFINITIONS[upgradePlan].price)} / user` : ''}
              </p>
              <p className="text-xs text-slate-500">
                {mode === 'upgrade_plan' ? `Current plan: ${PLAN_DEFINITIONS[currentPlan].name}` : `${org.totalSeats} seats today`}
              </p>
              <div />
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-950">Payment details</p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_90px]">
                <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Card number</label>
                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                </div>
                <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Expiry</label>
                <input
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                </div>
                <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">CVC</label>
                <input
                  value={cvc}
                  onChange={(event) => setCvc(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                </div>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          {successState ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{successState.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{successState.detail}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl px-3 py-1.5 text-xs"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-xl px-3 py-1.5 text-xs"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Pay'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsBillingActionModal;
