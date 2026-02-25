import React from 'react';
import { Clock3, LifeBuoy, Mail, ShieldAlert } from 'lucide-react';
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
  ['Onboarding support', 'Workspace setup, role model alignment, and initial rollout guidance.', 'Business day response'],
  ['Execution support', 'Workflow tuning, dependency handling, and delivery issue resolution.', 'Priority triage'],
  ['Account support', 'Billing, licensing, seats, and subscription operations.', 'Account ownership routing']
] as const;

const supportProcess = [
  ['1. Intake', 'Submit issue context and expected outcome.'],
  ['2. Triage', 'We classify severity and assign to the right support stream.'],
  ['3. Resolution', 'Receive actionable guidance with confirmation and follow-up.']
] as const;

const resources = [
  ['Workspace setup and template strategy', 'Get initial project structure right from day one.'],
  ['Role permissions and access controls', 'Map policy to role behavior across your teams.'],
  ['Completion approvals and lifecycle states', 'Understand governance for completion and reopen flows.']
] as const;

const SupportPage: React.FC<SupportPageProps> = (props) => (
  <MarketingPageShell
    activeNav="support"
    heroEyebrow="Support"
    heroTitle="Support for teams running active delivery cycles"
    heroDescription="From onboarding to scale, get practical help for operations, governance, and delivery reliability."
    heroAside={(
      <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
        <p className="text-sm font-medium text-white/80">Support channels</p>
        <div className="mt-3 space-y-2 text-sm text-white/90">
          <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />support@velo.app</p>
          <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />Business-day response target</p>
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
        <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[21px] font-semibold text-slate-900">{title}</p>
          <p className="mt-1.5 text-[14px] text-slate-600">{detail}</p>
          <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{badge}</p>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
      <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">How support works</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {supportProcess.map(([step, text]) => (
          <article key={step} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[17px] font-semibold text-slate-900">{step}</p>
            <p className="mt-1.5 text-[14px] text-slate-600">{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
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

    <section className="rounded-3xl bg-[#f0dce3] p-6 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">Need a guided product walkthrough too?</h2>
          <p className="mt-1 text-[16px] text-[#76003f]/85">Request a demo for team rollout and workflow design guidance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={props.onOpenPricing} className="border-[#76003f]/35 !text-[#76003f] hover:bg-[#f6ecf1]">View pricing</Button>
          <Button onClick={props.onOpenContact} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Request demo</Button>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-800">
      <p className="inline-flex items-center gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-[#76003f]" />For account-security incidents, include urgency in subject for immediate triage.</p>
    </section>
  </MarketingPageShell>
);

export default SupportPage;
