import React from 'react';
import { Check } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface PricingPageProps {
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenSupport: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    unit: 'per user / month',
    features: ['Up to 3 licensed users', 'Boards, projects, roadmap', 'Core collaboration']
  },
  {
    name: 'Basic',
    price: '$5',
    unit: 'per user / month',
    features: ['Unlimited users', 'Analytics + integrations', 'Advanced filters and saved views'],
    highlighted: true
  },
  {
    name: 'Pro',
    price: '$7',
    unit: 'per user / month',
    features: ['Everything in Basic', 'Workflow automation + approvals', 'AI copilot + governance']
  }
] as const;

const featureMatrix = [
  ['Licensed users', 'Up to 3', 'Unlimited', 'Unlimited'],
  ['Boards and stages', 'Included', 'Included', 'Included'],
  ['Projects and lifecycle states', 'Included', 'Included', 'Included'],
  ['Task comments and collaboration', 'Included', 'Included', 'Included'],
  ['Roadmap view', 'Included', 'Included', 'Included'],
  ['Analytics dashboards', 'Basic', 'Advanced', 'Advanced'],
  ['Resource workload view', 'Basic', 'Advanced', 'Advanced'],
  ['Saved filters and board views', 'No', 'Included', 'Included'],
  ['Workflow automation rules', 'No', 'Basic', 'Advanced'],
  ['Completion approval controls', 'No', 'Optional', 'Full'],
  ['AI task and project copilot', 'No', 'Limited', 'Full'],
  ['AI audit and recommendations', 'No', 'Limited', 'Full'],
  ['Integrations (GitHub / Slack)', 'Basic', 'Included', 'Included'],
  ['Audit and governance controls', 'Basic', 'Standard', 'Advanced'],
  ['Priority support path', 'Standard', 'Standard', 'Priority']
] as const;

const PricingPage: React.FC<PricingPageProps> = (props) => (
  <MarketingPageShell
    activeNav="pricing"
    heroEyebrow="Pricing"
    heroTitle="Simple pricing, built for serious teams"
    heroDescription="Start lightweight, scale when needed, and keep your delivery operations predictable at every stage."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Included in every plan</p>
        <ul className="mt-3 space-y-2 text-sm text-white/90">
          <li className="inline-flex items-center gap-2"><Check className="h-4 w-4" />Secure workspace access</li>
          <li className="inline-flex items-center gap-2"><Check className="h-4 w-4" />Role-based project visibility</li>
          <li className="inline-flex items-center gap-2"><Check className="h-4 w-4" />Fast onboarding for teams</li>
        </ul>
      </article>
    )}
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onOpenProduct}
    onOpenSolutions={props.onOpenSolutions}
    onOpenPricing={props.onBackToHome}
    onOpenSupport={props.onOpenSupport}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.name}
          className={`rounded-3xl border bg-white p-6 ${plan.highlighted ? 'border-[#b57494] ring-1 ring-[#d8b9c8]' : 'border-slate-200'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[22px] font-semibold tracking-tight text-slate-900">{plan.name}</p>
            {plan.highlighted ? (
              <span className="rounded-full border border-[#c88eaa] bg-[#f7ebf1] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#76003f]">
                Most popular
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-[40px] font-semibold leading-none text-[#76003f]">{plan.price}</p>
          <p className="mt-1 text-sm text-slate-500">{plan.unit}</p>
          <ul className="mt-5 space-y-2.5 text-[14px] text-slate-700">
            {plan.features.map((feature) => (
              <li key={feature} className="inline-flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-[#76003f]" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            onClick={props.onGetStarted}
            variant={plan.highlighted ? 'primary' : 'outline'}
            className={`mt-6 w-full rounded-full ${plan.highlighted ? '!bg-[#76003f] hover:!bg-[#640035] !text-white' : '!text-slate-900'}`}
          >
            Choose {plan.name}
          </Button>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Complete feature matrix</h2>
        <p className="text-sm text-slate-500">Everything included per license tier</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-slate-600">
              <th className="border-b border-slate-200 px-3 py-2">Feature</th>
              <th className="border-b border-slate-200 px-3 py-2">Free</th>
              <th className="border-b border-slate-200 px-3 py-2">Basic</th>
              <th className="border-b border-slate-200 px-3 py-2">Pro</th>
            </tr>
          </thead>
          <tbody>
            {featureMatrix.map(([feature, free, basic, pro]) => (
              <tr key={feature}>
                <td className="border-b border-slate-100 px-3 py-2.5 font-medium text-slate-900">{feature}</td>
                <td className="border-b border-slate-100 px-3 py-2.5 text-slate-700">{free}</td>
                <td className="border-b border-slate-100 px-3 py-2.5 text-slate-700">{basic}</td>
                <td className="border-b border-slate-100 px-3 py-2.5 text-slate-700">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">Need enterprise pricing?</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">For large rollout, procurement, or governance requirements, talk to our team.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={props.onOpenSupport} className="border-[#76003f]/35 !text-[#76003f] hover:bg-[#f6ecf1]">Talk to support</Button>
          <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
        </div>
      </div>
    </section>
  </MarketingPageShell>
);

export default PricingPage;
