import React from 'react';
import { CalendarCheck2, CheckCircle2, Clock3, LifeBuoy, Mail, Rocket, ShieldAlert, Users2 } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface SupportPageProps {
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const supportStreams = [
  ['Onboarding support', 'Workspace setup, role setup, and first rollout guidance.', 'Business day response'],
  ['Execution support', 'Workflow tuning, dependency support, and delivery issue resolution.', 'Priority triage'],
  ['Account support', 'Billing, licensing, seats, and subscription support.', 'Account routing']
] as const;

const onboardingFlow = [
  ['Step 1', 'Create workspace and admin account', 'Reserve subdomain, verify admin, and activate your first seats.'],
  ['Step 2', 'Connect Microsoft SSO', 'Grant tenant consent once, choose sender mailbox, and verify delivery.'],
  ['Step 3', 'Add and license users', 'Invite core team, set roles, and verify first login flow.'],
  ['Step 4', 'Configure project model', 'Set projects, stages, workflows, and completion approvals.'],
  ['Step 5', 'Go live with first project', 'Create first board, generate tasks, and start execution.']
] as const;

const resources = [
  ['Workspace setup and templates', 'Build a clean project structure from day one.'],
  ['Roles and access controls', 'Map policy to role behavior across your teams.'],
  ['Completion approvals and lifecycle', 'Control completion and reopen flows clearly.'],
  ['Sender mailbox readiness', 'Validate sender and recipient delivery before rollout.']
] as const;

const SupportPage: React.FC<SupportPageProps> = (props) => (
  <MarketingPageShell
    activeNav="support"
    heroEyebrow="Support"
    heroTitle="Support for real delivery teams"
    heroDescription="From onboarding to scale, get practical support for operations, controls, and delivery health."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Support channels</p>
        <div className="mt-3 space-y-2 text-sm text-white/90">
          <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />support@velo.app</p>
            <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />Business day response target</p>
          <p className="inline-flex items-center gap-2"><LifeBuoy className="h-4 w-4" />Product + admin support</p>
        </div>
      </article>
    )}
    onBackToHome={props.onBackToHome}
    onOpenProduct={props.onOpenProduct}
    onOpenSolutions={props.onOpenSolutions}
    onOpenPricing={props.onOpenPricing}
    onOpenSupport={props.onBackToHome}
    onOpenContact={props.onOpenContact}
    onSignIn={props.onSignIn}
    onGetStarted={props.onGetStarted}
  >
    <section className="grid gap-4 md:grid-cols-3">
      {supportStreams.map(([title, detail, badge]) => (
        <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[21px] font-semibold text-slate-900">{title}</p>
          <p className="mt-1.5 text-[14px] text-slate-600">{detail}</p>
          <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{badge}</p>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Onboarding guide</h2>
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"><CalendarCheck2 className="h-3.5 w-3.5" />Typical setup: 1 to 2 business days</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {onboardingFlow.map(([step, title, text]) => (
          <article key={step} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#76003f]">{step}</p>
            <p className="mt-1 text-[17px] font-semibold text-slate-900">{title}</p>
            <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
      <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Day-0 rollout checklist</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Rocket className="h-4 w-4 text-[#76003f]" />Platform readiness</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Subdomain and org profile set</li>
            <li className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Roles and seats verified</li>
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Users2 className="h-4 w-4 text-[#76003f]" />Team readiness</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Owner/admin accounts active</li>
            <li className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Member invite path tested</li>
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Mail className="h-4 w-4 text-[#76003f]" />Notification readiness</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Sender mailbox configured</li>
            <li className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Test ticket mail delivered</li>
          </ul>
        </article>
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
      <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Common support areas</h2>
      <div className="mt-4 space-y-3">
        {resources.map(([title, text]) => (
          <article key={title} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[16px] font-semibold text-slate-900">{title}</p>
            <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">Need a guided walkthrough?</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">Request a demo for rollout planning and workflow guidance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={props.onOpenPricing} className="border-[#76003f]/35 !text-[#76003f] hover:bg-[#f6ecf1]">View pricing</Button>
          <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm">
      <p className="inline-flex items-center gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-[#76003f]" />For account security incidents, include urgency in your message subject.</p>
    </section>
  </MarketingPageShell>
);

export default SupportPage;
