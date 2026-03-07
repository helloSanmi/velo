import React from 'react';
import { Building2, CheckCircle2, CircleDollarSign, Compass, Layers3, ShieldCheck, Users } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface SolutionsPageProps {
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenPricing: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const outcomes = [
  { label: 'Planning', value: 'Clear ownership', icon: Users },
  { label: 'Approvals', value: 'Approval checkpoints', icon: ShieldCheck },
  { label: 'Reporting', value: 'Live status', icon: Compass },
  { label: 'Workspace', value: 'Less status noise', icon: CircleDollarSign }
] as const;

const journeyStages = [
  {
    step: '01',
    title: 'Plan work clearly',
    text: 'Define scope, owners, and due dates in one place.'
  },
  {
    step: '02',
    title: 'Control key decisions',
    text: 'Use approval checkpoints and activity history to keep high impact changes controlled.'
  },
  {
    step: '03',
    title: 'Report progress fast',
    text: 'See progress, risk, and workload without manual status meetings.'
  }
] as const;

const useCases = [
  {
    buyer: 'Planning',
    title: 'Planning and execution',
    summary: 'Track work by stage and keep ownership clear from planning through execution.',
    bullets: ['Track work by stage', 'Clear handoffs', 'Live progress']
  },
  {
    buyer: 'Approvals',
    title: 'Approvals and control',
    summary: 'Add approval checkpoints before completion and other sensitive transitions.',
    bullets: ['Sensitive transitions', 'Activity history', 'Approval control']
  },
  {
    buyer: 'Reporting',
    title: 'Reporting and visibility',
    summary: 'See live status, risk, and workload in one shared workspace.',
    bullets: ['Blocked work', 'Risk and workload', 'Less manual reporting']
  }
] as const;

const rolloutFlow = [
  { step: 'Plan', text: 'Create the workflow, owners, and due dates.' },
  { step: 'Run', text: 'Move work with updates, comments, and approvals.' },
  { step: 'Review', text: 'Check progress, workload, and blocked work.' },
  { step: 'Report', text: 'Share live status without manual reporting.' }
] as const;

const proofPoints = [
  { title: 'Status quality', before: 'Scattered updates', after: 'One shared view', icon: CheckCircle2 },
  { title: 'Approval control', before: 'Unclear approvals', after: 'Approval checkpoints', icon: ShieldCheck },
  { title: 'Delivery flow', before: 'Tool switching', after: 'One workspace', icon: Layers3 }
] as const;

const SolutionsPage: React.FC<SolutionsPageProps> = (props) => (
  <MarketingPageShell
    activeNav="solutions"
    heroEyebrow="Solutions"
    heroTitle="Use cases for planning, approvals, and reporting"
    heroDescription="Velo helps teams run delivery in one workspace with clear ownership, approval checkpoints, and live status."
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onOpenProduct}
    onOpenSolutions={props.onBackToHome}
    onOpenPricing={props.onOpenPricing}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="rounded-3xl border border-[#e7d3db] bg-[#fcf7f9] p-6 md:p-7 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Outcome map</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">Run work with clear ownership, approvals, and reporting</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          These use cases show how teams use Velo to plan work, approve changes, and report progress in one workspace.
        </p>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {journeyStages.map((stage) => (
          <article key={stage.step} className="relative rounded-[28px] border border-[#e7d3db] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f7edf1] text-[13px] font-semibold text-[#76003f]">
                {stage.step}
              </div>
              <div className="h-px flex-1 bg-[#eedde4]" />
            </div>
            <h3 className="mt-5 text-[22px] leading-[1.12] font-semibold tracking-tight text-slate-900">{stage.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{stage.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {outcomes.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="inline-flex items-center gap-2 rounded-full border border-[#e7d3db] bg-white px-3.5 py-2 text-[13px] text-slate-700">
              <Icon className="h-4 w-4 text-[#76003f]" />
              <span className="font-medium text-slate-900">{item.value}</span>
              <span className="text-slate-500">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Solution tracks</p>
        <h2 className="mt-2 text-[28px] leading-[1.12] font-semibold tracking-tight text-slate-900">Choose the use case that matches how your team works</h2>
      </div>
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200">
            <div className="bg-slate-50 p-4" />
            {useCases.map((item) => (
              <div key={item.title} className="bg-[#fcf7f9] p-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-slate-700">
                  <Building2 className="h-3.5 w-3.5 text-[#76003f]" />
                  {item.buyer}
                </div>
                <h3 className="mt-3 text-[20px] leading-[1.1] font-semibold tracking-tight text-slate-900">{item.title}</h3>
              </div>
            ))}

            <div className="bg-slate-50 p-4 text-[12px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Use case</div>
            {useCases.map((item) => (
              <div key={`${item.title}-summary`} className="bg-white p-4 text-[14px] leading-relaxed text-slate-600">
                {item.summary}
              </div>
            ))}

            <div className="bg-slate-50 p-4 text-[12px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Primary gain</div>
            {useCases.map((item) => (
              <div key={`${item.title}-gain`} className="bg-white p-4 text-[15px] font-semibold text-slate-900">
                {item.bullets[0]}
              </div>
            ))}

            <div className="bg-slate-50 p-4 text-[12px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Operational focus</div>
            {useCases.map((item) => (
              <div key={`${item.title}-focus`} className="bg-white p-4 text-[14px] text-slate-700">
                {item.bullets[1]}
              </div>
            ))}

            <div className="bg-slate-50 p-4 text-[12px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Expected result</div>
            {useCases.map((item) => (
              <div key={`${item.title}-outcome`} className="bg-white p-4 text-[14px] text-slate-700">
                {item.bullets[2]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="rounded-3xl border border-[#d7c0cb] bg-[#f7edf1] p-6 md:p-7 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Team workflow</p>
          <h2 className="mt-2 text-[28px] leading-[1.12] font-semibold tracking-tight text-slate-900">How teams use Velo through the week</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#dcc6d0] bg-white p-3">
            <img src="/landing/rollout-plan.svg" alt="Velo rollout plan illustration" className="h-auto w-full rounded-xl" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {rolloutFlow.map((item, index) => (
            <article key={item.step} className="rounded-xl border border-[#dcc6d0] bg-white p-3.5">
              <p className="text-[12px] font-semibold tracking-[0.12em] text-[#76003f] uppercase">{String(index + 1).padStart(2, '0')}</p>
              <p className="mt-1.5 text-[17px] font-semibold text-slate-900">{item.step}</p>
              <p className="mt-1 text-[13px] text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Proof of value</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">What teams improve with one shared workspace</h2>
        </div>
        <span className="text-sm text-slate-500">Visible in planning, approvals, and reporting</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {proofPoints.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <Icon className="h-4 w-4 text-[#76003f]" />
                {item.title}
              </p>
              <p className="mt-2 text-[12px] text-slate-500">Before</p>
              <p className="text-[13px] text-slate-600">{item.before}</p>
              <p className="mt-2 text-[12px] text-[#76003f]">After</p>
              <p className="text-[13px] font-medium text-slate-900">{item.after}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Start with your workflow</p>
          <h2 className="mt-2 text-[28px] leading-[1.1] font-semibold tracking-tight text-[#76003f]">See how Velo fits your team&apos;s process</h2>
          <p className="mt-2 text-[15px] text-[#76003f]/85">
            We can walk through your current workflow and show how Velo handles planning, approvals, and reporting in one workspace.
          </p>
        </div>
        <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Contact sales</Button>
      </div>
    </section>
  </MarketingPageShell>
);

export default SolutionsPage;
