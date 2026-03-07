import React from 'react';
import { Check } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';
import { PLAN_DEFINITIONS } from '../services/planFeatureService';

interface PricingPageProps {
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
  onChoosePlan: (plan: 'free' | 'basic' | 'pro') => void;
}

const plans = [
  { ...PLAN_DEFINITIONS.free },
  { ...PLAN_DEFINITIONS.basic, highlighted: true },
  { ...PLAN_DEFINITIONS.pro }
] as const;

const PricingPage: React.FC<PricingPageProps> = (props) => (
  <MarketingPageShell
    activeNav="pricing"
    heroEyebrow="Pricing"
    heroTitle="Simple pricing by plan"
    heroDescription="Compare plans by the features each team needs."
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onOpenProduct}
    onOpenSolutions={props.onOpenSolutions}
    onOpenPricing={props.onBackToHome}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="grid gap-5 lg:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.name}
          className={`flex h-full flex-col rounded-3xl border bg-white p-6 shadow-sm ${
            plan.highlighted ? 'border-[#c88eaa] ring-1 ring-[#e6ccd8]' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[24px] font-semibold tracking-tight text-slate-900">{plan.name}</p>
              <p className="mt-1 text-[14px] text-slate-600">{plan.summary}</p>
            </div>
            {plan.highlighted ? (
              <span className="rounded-full bg-[#f7edf1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#76003f]">
                Popular
              </span>
            ) : null}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <p className="text-[40px] font-semibold leading-none text-[#76003f]">${plan.price}</p>
            <p className="mt-1 text-[13px] text-slate-500">{plan.unit}</p>
            <p className="mt-2 text-[13px] text-slate-600">{plan.seatLabel}</p>
          </div>

          <div className="mt-6 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">Included features</p>
            <ul className="mt-3 space-y-3 text-[14px] text-slate-700">
            {plan.featureList.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#76003f]" />
                <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={() => props.onChoosePlan(plan.id)}
            variant={plan.highlighted ? 'primary' : 'outline'}
            className={`mt-6 w-full rounded-full ${
              plan.highlighted ? '!bg-[#76003f] hover:!bg-[#640035] !text-white' : '!text-slate-900'
            }`}
          >
            Choose {plan.name}
          </Button>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Enterprise</p>
          <h2 className="mt-2 text-[28px] leading-[1.1] font-semibold tracking-tight text-slate-900">Need a larger setup?</h2>
          <p className="mt-2 text-[15px] text-slate-600">
            Contact us if you need help with pricing, onboarding, or a larger team rollout.
          </p>
        </div>
        <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">
          Talk to sales
        </Button>
      </div>
    </section>
  </MarketingPageShell>
);

export default PricingPage;
