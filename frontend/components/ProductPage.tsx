import React from 'react';
import { Bot, ChartNoAxesColumn, ClipboardCheck, Gauge, ShieldCheck, Workflow } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface ProductPageProps {
  onBackToHome: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenSupport: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const modules = [
  { title: 'Execution boards', detail: 'Run projects with custom stages, assignees, and clear ownership.', icon: Workflow },
  { title: 'Approval controls', detail: 'Require owner approval for completion, reopen, and sensitive changes.', icon: ShieldCheck },
  { title: 'Delivery analytics', detail: 'Track flow, risk, and performance with live workspace metrics.', icon: ChartNoAxesColumn },
  { title: 'AI copilot', detail: 'Get summaries and actions based on your real project data.', icon: Bot },
  { title: 'Project lifecycle', detail: 'Manage active, completed, archived, and deleted project states.', icon: ClipboardCheck },
  { title: 'Faster operations', detail: 'Use shared workflows to reduce confusion and move work faster.', icon: Gauge }
] as const;

const model = [
  ['Plan', 'Set scope, owners, due dates, and workflow rules.'],
  ['Run', 'Execute work with live views across boards, list, calendar, and Gantt.'],
  ['Control', 'Apply approvals where needed and keep a full activity trail.'],
  ['Report', 'Share clear status, risk, and next actions with your team.']
] as const;

const stats = [
  ['One source of truth', 'Projects, tasks, approvals, and ticketing in one workspace.'],
  ['Role based controls', 'Actions and visibility follow project role and policy.'],
  ['Faster decisions', 'Less status chasing, more execution and clear ownership.']
] as const;

const faqs = [
  ['Can we configure stages by team?', 'Yes. Each project can use its own stages based on how that team works.'],
  ['Can members complete projects directly?', 'You can require approval first. Owners can enforce this in the project flow.'],
  ['Does the copilot use real context?', 'Yes. It uses your workspace data and current project state, not generic text.']
] as const;

const ProductPage: React.FC<ProductPageProps> = (props) => (
  <MarketingPageShell
    activeNav="product"
    heroEyebrow="Product"
    heroTitle="One product for planning and delivery control"
    heroDescription="Velo combines projects, tasks, approvals, ticketing, and reporting so teams can deliver with less friction."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Built for daily execution</p>
        <ul className="mt-3 space-y-2 text-sm text-white/90">
          <li>Track each handoff with clear owners.</li>
          <li>Control completion with approval rules.</li>
          <li>Keep a full activity and decision history.</li>
        </ul>
      </article>
    )}
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onBackToHome}
    onOpenSolutions={props.onOpenSolutions}
    onOpenPricing={props.onOpenPricing}
    onOpenSupport={props.onOpenSupport}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="grid gap-3 md:grid-cols-3">
      {stats.map(([title, text]) => (
        <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[19px] font-semibold text-slate-900">{title}</p>
          <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Core capabilities</h2>
        <p className="text-sm text-slate-500">Everything in one execution workspace</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article key={module.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-[#76003f]"><Icon className="h-4 w-4" /></div>
              <p className="mt-3 text-[18px] font-semibold text-slate-900">{module.title}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{module.detail}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
        <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Operating model</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {model.map(([step, text]) => (
            <article key={step} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[18px] font-semibold text-slate-900">{step}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </article>
      <article className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
        <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Product FAQs</h2>
        <div className="mt-4 space-y-3">
          {faqs.map(([q, a]) => (
            <article key={q} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[16px] font-semibold text-slate-900">{q}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{a}</p>
            </article>
          ))}
        </div>
      </article>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">See this with your own workflow</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">We will map your current process and show how it runs in Velo.</p>
        </div>
        <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
      </div>
    </section>
  </MarketingPageShell>
);

export default ProductPage;
