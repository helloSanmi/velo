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
  { title: 'Product teams', detail: 'Connect roadmap planning to real delivery status and release readiness.', icon: Rocket },
  { title: 'Operations', detail: 'Use repeatable workflows and reduce delivery confusion between teams.', icon: BriefcaseBusiness },
  { title: 'Marketing', detail: 'Run campaign planning and approvals with clear handoffs.', icon: Users },
  { title: 'PMO and leadership', detail: 'Track project health and portfolio risk from one view.', icon: Building2 },
  { title: 'Engineering', detail: 'Surface blockers, dependencies, and workload pressure early.', icon: ShieldCheck },
  { title: 'Enterprise programs', detail: 'Scale access, approvals, and standards across business units.', icon: Building2 }
] as const;

const rollout = [
  ['Phase 1', 'Set up teams, roles, and base project templates.'],
  ['Phase 2', 'Enable workflow rules and completion approvals.'],
  ['Phase 3', 'Roll out analytics, reporting, and AI support.']
] as const;

const principles = [
  'Start with one team and one repeatable project flow.',
  'Set roles and approval rules before enabling automation.',
  'Review risk and cycle time weekly to improve delivery quality.'
];

const SolutionsPage: React.FC<SolutionsPageProps> = (props) => (
  <MarketingPageShell
    activeNav="solutions"
    heroEyebrow="Solutions"
    heroTitle="Solutions for every delivery team"
    heroDescription="Use Velo across product, operations, marketing, PMO, and enterprise programs with one clear operating model."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Why teams choose this model</p>
        <ul className="mt-3 space-y-2 text-sm text-white/90">
          <li>Shared process across functions.</li>
          <li>Clear ownership and approval gates.</li>
          <li>Consistent reporting from one source.</li>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
      <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">How teams run with Velo</h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {principles.map((rule) => (
          <li key={rule} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700">{rule}</li>
        ))}
      </ul>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
      <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Team solution playbooks</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {solutions.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-[#76003f]"><Icon className="h-4 w-4" /></div>
              <p className="mt-3 text-[18px] font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{item.detail}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
        <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Rollout roadmap</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {rollout.map(([phase, detail]) => (
            <article key={phase} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[18px] font-semibold text-slate-900">{phase}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{detail}</p>
            </article>
          ))}
        </div>
      </article>
      <article className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
        <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">When to start</h2>
        <p className="mt-3 text-[15px] text-slate-700">Start when teams are losing visibility, handoffs are breaking down, or leadership cannot trust project status.</p>
        <p className="mt-3 text-[15px] text-slate-700">Run one workflow first, prove the process, then scale to other teams.</p>
      </article>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">Need a rollout map for your org?</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">We can design a rollout path that matches your team structure and controls.</p>
        </div>
        <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
      </div>
    </section>
  </MarketingPageShell>
);

export default SolutionsPage;
