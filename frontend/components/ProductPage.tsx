import React from 'react';
import { Lock, MessageSquareText, PlugZap } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface ProductPageProps {
  onBackToHome: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const platformSignals = [
  { label: 'Workspace model', value: 'Projects, tasks, approvals', note: 'One shared data surface' },
  { label: 'Control plane', value: 'Role and policy actions', note: 'Govern high impact transitions' },
  { label: 'Decision signal', value: 'Risk, throughput, ownership', note: 'Live operational signals' },
  { label: 'Connected layer', value: 'Microsoft, Slack, GitHub', note: 'Keep execution context in sync' }
] as const;

const productProofBullets = [
  'One shared data surface for work and approvals',
  'Policy-backed transitions for sensitive changes',
  'Live operational signals for risk and ownership'
] as const;

const systemLayers = [
  {
    name: 'Work layer',
    points: ['Projects, tasks, subtasks', 'Views: Kanban, checklist, table, calendar, Gantt', 'Comment and activity history']
  },
  {
    name: 'Control layer',
    points: ['Role based permissions', 'Approval checkpoints', 'Policy backed transitions']
  },
  {
    name: 'Signal layer',
    points: ['Forecast and effort tracking', 'Risk indicators', 'Actionable recommendations']
  },
  {
    name: 'Integration layer',
    points: ['Microsoft sign in', 'Workspace notifications', 'GitHub and Slack connectivity']
  }
] as const;

const productFaq = [
  ['Can each team use different stages?', 'Yes. Every project can define and manage its own stage flow.'],
  ['Can owners enforce approvals?', 'Yes. Completion and other high impact steps can require approval.'],
  ['Does AI use real workspace data?', 'Yes. Copilot responses use current project state and task context.']
] as const;

const ProductPage: React.FC<ProductPageProps> = (props) => (
  <MarketingPageShell
    activeNav="product"
    heroEyebrow="Product"
    heroTitle="One operating system for controlled delivery"
    heroDescription="Velo combines planning, execution, approvals, ticketing, and reporting on one shared operating surface."
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onBackToHome}
    onOpenSolutions={props.onOpenSolutions}
    onOpenPricing={props.onOpenPricing}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#76003f]">Platform design</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">Built as one operating surface for delivery</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
          Velo keeps workflow, governance, reporting, and integrations on the same platform layer.
        </p>
        <ul className="mt-4 space-y-2.5 text-[15px] text-slate-700">
          {productProofBullets.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
      <div className="grid gap-3 sm:grid-cols-2">
        {platformSignals.map((signal) => (
          <article key={signal.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">{signal.label}</p>
              <p className="mt-1.5 text-[17px] leading-[1.2] font-semibold tracking-tight text-slate-900">{signal.value}</p>
              <p className="mt-1 text-[13px] text-slate-600">{signal.note}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl border border-[#d7c0cb] bg-[#f7edf1] p-6 md:p-7 shadow-sm">
      <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">System layers</p>
      <h2 className="mt-2 text-[28px] leading-[1.12] font-semibold tracking-tight text-slate-900">How the product is structured end to end</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {systemLayers.map((layer, index) => (
          <article key={layer.name} className="rounded-xl border border-[#dcc6d0] bg-white p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#76003f] uppercase">Layer {index + 1}</p>
            <p className="mt-1.5 text-[17px] font-semibold text-slate-900">{layer.name}</p>
            <ul className="mt-2.5 space-y-1.5 text-[13px] text-slate-700">
              {layer.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl border border-[#d7c0cb] bg-[#f7edf1] p-6 md:p-7 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Execution surface</p>
          <h2 className="mt-2 text-[28px] leading-[1.12] font-semibold tracking-tight text-slate-900">Plan and run work from one operational view</h2>
        </div>
        <span className="rounded-full border border-[#76003f]/15 bg-white px-3 py-1 text-[12px] font-medium text-[#76003f]">
          Multi-view runtime
        </span>
      </div>
      <figure className="mt-4 overflow-hidden rounded-2xl border border-[#dcc6d0] bg-white shadow-sm">
        <img src="/landing/execution-board.png" alt="Velo execution board screenshot" className="h-full w-full object-cover" />
      </figure>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-[#dcc6d0] bg-white p-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#76003f] uppercase">Views</p>
          <p className="mt-1.5 text-[17px] font-semibold text-slate-900">Board, table, checklist, calendar, Gantt</p>
        </article>
        <article className="rounded-2xl border border-[#dcc6d0] bg-white p-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#76003f] uppercase">Controls</p>
          <p className="mt-1.5 text-[17px] font-semibold text-slate-900">Fast filtering for assignee, status, and due state</p>
        </article>
        <article className="rounded-2xl border border-[#dcc6d0] bg-white p-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#76003f] uppercase">Updates</p>
          <p className="mt-1.5 text-[17px] font-semibold text-slate-900">Live task and comment activity in context</p>
        </article>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <img src="/landing/governance-approval.png" alt="Velo governance and control screenshot" className="h-full w-full object-cover" />
      </figure>
      <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
        <p className="text-[13px] font-semibold tracking-[0.15em] text-[#76003f] uppercase">Governance and control</p>
        <h2 className="mt-2 text-[26px] leading-[1.14] font-semibold tracking-tight text-slate-900">Approve high impact changes with context</h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">
          Keep completion and escalation decisions controlled, visible, and traceable.
        </p>
        <ul className="mt-4 grid gap-2 text-[14px] text-slate-700 sm:grid-cols-2">
          <li>Approval points for sensitive actions</li>
          <li>Who approved and when in activity history</li>
          <li>Clear separation of member and owner authority</li>
        </ul>
        <div className="mt-5 inline-flex rounded-full border border-[#76003f]/15 bg-[#f7edf1] px-3 py-1 text-[12px] font-medium text-[#76003f]">
          Audit trail + controlled transitions
        </div>
      </article>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <article>
          <h2 className="text-[24px] font-semibold tracking-tight text-slate-900">Operational extensions</h2>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><MessageSquareText className="h-4 w-4 text-[#76003f]" /> Ticketing and delivery in one flow</p>
              <p className="mt-1 text-[13px] text-slate-600">Move from intake to execution without losing context.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Lock className="h-4 w-4 text-[#76003f]" /> Workspace security controls</p>
              <p className="mt-1 text-[13px] text-slate-600">Control access, licensing, and approvals with clear admin policies.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><PlugZap className="h-4 w-4 text-[#76003f]" /> Microsoft native connection</p>
              <p className="mt-1 text-[13px] text-slate-600">Use workspace sign in and notifications from your tenant.</p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4.5">
          <h3 className="text-[20px] leading-[1.2] font-semibold tracking-tight text-slate-900">Common product questions</h3>
          <div className="mt-3 space-y-2.5">
            {productFaq.map(([q, a]) => (
              <article key={q} className="rounded-xl border border-slate-200 bg-white p-3.5">
                <p className="text-[15px] font-semibold text-slate-900">{q}</p>
                <p className="mt-1 text-[13px] text-slate-600">{a}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  </MarketingPageShell>
);

export default ProductPage;
