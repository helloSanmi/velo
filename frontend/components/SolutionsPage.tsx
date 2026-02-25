import React from 'react';
import { BriefcaseBusiness, Building2, Rocket, ShieldCheck, Users } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface SolutionsPageProps {
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenPricing: () => void;
  onOpenSupport: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const solutions = [
  { title: 'Product teams', detail: 'Align roadmap decisions with delivery reality and release readiness.', icon: Rocket },
  { title: 'Operations', detail: 'Standardize recurring execution patterns and reduce process drift.', icon: BriefcaseBusiness },
  { title: 'Marketing', detail: 'Run campaigns, approvals, and launch timelines with cleaner handoffs.', icon: Users },
  { title: 'PMO and leadership', detail: 'Track delivery health and portfolio risk with reliable signals.', icon: Building2 },
  { title: 'Engineering', detail: 'Surface blockers, dependencies, and workload pressure early.', icon: ShieldCheck },
  { title: 'Enterprise programs', detail: 'Scale governance and access controls across teams and business units.', icon: Building2 }
] as const;

const rollout = [
  ['Phase 1', 'Model teams, ownership, and core project templates.'],
  ['Phase 2', 'Enable workflow automation and completion approvals.'],
  ['Phase 3', 'Operationalize analytics, reporting, and AI insights.']
] as const;

const principles = [
  'Start with one team and one repeatable workflow.',
  'Define role and approval boundaries before automation.',
  'Review risk and cycle metrics regularly to improve delivery quality.'
];

const SolutionsPage: React.FC<SolutionsPageProps> = (props) => (
  <MarketingPageShell
    activeNav="solutions"
    heroEyebrow="Solutions"
    heroTitle="Solution patterns for every delivery function"
    heroDescription="Use Velo across product, operations, marketing, PMO, and enterprise programs with one governance model."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Why teams adopt this model</p>
        <ul className="mt-3 space-y-2 text-sm text-white/90">
          <li>Shared operating language across functions.</li>
          <li>Clear ownership and approval gates.</li>
          <li>Consistent reporting from one data model.</li>
        </ul>
      </article>
    )}
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onOpenProduct}
    onOpenSolutions={props.onBackToHome}
    onOpenPricing={props.onOpenPricing}
    onOpenSupport={props.onOpenSupport}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Team solution playbooks</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {solutions.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-[#76003f]"><Icon className="h-4 w-4" /></div>
              <p className="mt-3 text-[18px] font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{item.detail}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Rollout roadmap</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rollout.map(([phase, detail]) => (
          <article key={phase} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[18px] font-semibold text-slate-900">{phase}</p>
            <p className="mt-1.5 text-[14px] text-slate-600">{detail}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Implementation principles</h2>
      <ul className="mt-4 space-y-2 text-[15px] text-slate-700">
        {principles.map((rule) => (
          <li key={rule} className="rounded-xl border border-slate-200 bg-white px-4 py-3">{rule}</li>
        ))}
      </ul>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">Need a solution map for your org?</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">We can design a rollout path that matches your team structure and governance model.</p>
        </div>
        <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
      </div>
    </section>
  </MarketingPageShell>
);

export default SolutionsPage;
