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
  { title: 'Execution boards', detail: 'Custom stages, dependencies, assignees, and clean ownership across teams.', icon: Workflow },
  { title: 'Governed approvals', detail: 'Owner/admin approval flows for completion, reopening, and sensitive transitions.', icon: ShieldCheck },
  { title: 'Delivery intelligence', detail: 'Live throughput, risk, and performance visibility with actionable reporting.', icon: ChartNoAxesColumn },
  { title: 'AI copilots', detail: 'Grounded project insights, summaries, and recommendations from real workspace data.', icon: Bot },
  { title: 'Lifecycle control', detail: 'Manage active, completed, archived, and deleted states with complete history.', icon: ClipboardCheck },
  { title: 'Operational speed', detail: 'Standardize execution patterns so teams deliver faster without process drift.', icon: Gauge }
] as const;

const model = [
  ['Plan', 'Define scope, ownership, and standards before execution starts.'],
  ['Run', 'Execute work with real-time visibility and policy-aware workflows.'],
  ['Control', 'Apply approvals and governance for critical lifecycle changes.'],
  ['Report', 'Share reliable status, risk, and next actions with leadership.']
] as const;

const stats = [
  ['Single source of truth', 'Projects, tasks, approvals, and audits in one workspace.'],
  ['Role-aware operations', 'Access and actions aligned to user role and project context.'],
  ['Faster decision loops', 'Less status chasing, more execution and informed actions.']
] as const;

const faqs = [
  ['Can we configure stages by team?', 'Yes. Stage structures are configurable by project and can follow team-specific operating models.'],
  ['Can members complete projects directly?', 'Completion behavior follows your policy. Owners/admins can enforce approval-required completion.'],
  ['Is copilot generic or context-based?', 'Copilot uses workspace context and project data available to the current user session.']
] as const;

const ProductPage: React.FC<ProductPageProps> = (props) => (
  <MarketingPageShell
    activeNav="product"
    heroEyebrow="Product"
    heroTitle="A controlled system for reliable delivery"
    heroDescription="Velo brings planning, execution, approvals, and reporting together so teams move fast without losing governance."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Built for daily execution discipline</p>
        <ul className="mt-3 space-y-2 text-sm text-white/90">
          <li>Track each handoff with owner visibility.</li>
          <li>Prevent uncontrolled completion transitions.</li>
          <li>Keep audit and reporting clean by default.</li>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Core capabilities</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article key={module.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-[#76003f]"><Icon className="h-4 w-4" /></div>
              <p className="mt-3 text-[18px] font-semibold text-slate-900">{module.title}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{module.detail}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Operating model</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {model.map(([step, text]) => (
          <article key={step} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[18px] font-semibold text-slate-900">{step}</p>
            <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-3">
      {stats.map(([title, text]) => (
        <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[19px] font-semibold text-slate-900">{title}</p>
          <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Product FAQs</h2>
      <div className="mt-4 space-y-3">
        {faqs.map(([q, a]) => (
          <article key={q} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[16px] font-semibold text-slate-900">{q}</p>
            <p className="mt-1.5 text-[14px] text-slate-600">{a}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">See this in your own workflow context</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">We can map your current process and show a realistic execution model in Velo.</p>
        </div>
        <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
      </div>
    </section>
  </MarketingPageShell>
);

export default ProductPage;
