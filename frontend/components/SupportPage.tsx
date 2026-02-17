import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import Button from './ui/Button';

interface SupportPageProps {
  onBackToHome: () => void;
  onOpenPricing: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const supportStreams = [
  ['Onboarding support', 'Workspace setup, initial structure, and team rollout guidance.'],
  ['Execution support', 'Dependencies, workflows, and delivery reporting recommendations.'],
  ['Account support', 'Billing, seat management, access, and subscription updates.']
];

const SupportPage: React.FC<SupportPageProps> = ({ onBackToHome, onOpenPricing, onSignIn, onGetStarted }) => (
  <div className="min-h-screen bg-[#efefef] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-300 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-6">
        <button onClick={onBackToHome} className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBackToHome}><ArrowLeft className="mr-1.5 h-4 w-4" />Home</Button>
          <Button variant="ghost" size="sm" onClick={onOpenPricing}>Pricing</Button>
          <Button variant="ghost" size="sm" onClick={onSignIn}>Log in</Button>
          <Button size="sm" onClick={onGetStarted} className="rounded-full !bg-black px-5 !text-white hover:!bg-slate-900">Get started</Button>
        </div>
      </div>
    </header>

    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-6 md:py-10">
      <section className="rounded-3xl bg-[#76003f] px-6 py-8 text-white md:px-8 md:py-10">
        <p className="text-xs uppercase tracking-[0.14em] text-white/70">Support</p>
        <h1 className="mt-2 text-[36px] font-semibold leading-[0.98] tracking-tight md:text-[52px]">Support for teams running active delivery cycles</h1>
        <p className="mt-3 max-w-3xl text-[18px] text-white/90 md:text-[22px]">
          From setup to scale, get practical help for workflow design, execution quality, and account management.
        </p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {supportStreams.map(([title, text]) => (
          <article key={title} className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <p className="text-[24px] font-semibold tracking-tight text-slate-900">{title}</p>
            <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Common support topics</h2>
          <ul className="mt-3 space-y-2 text-[16px] text-slate-700">
            <li>Workspace setup and template strategy</li>
            <li>Role permissions and access issues</li>
            <li>Board, roadmap, and status reporting</li>
            <li>Billing and seat adjustments</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Contact and policy</h2>
          <p className="mt-2 flex items-center gap-2 text-[16px] text-slate-700"><Mail className="h-4 w-4 text-slate-500" />support@velo.app</p>
          <p className="mt-2 text-[15px] text-slate-600">Most requests receive a response within one business day.</p>
          <div className="mt-4 flex items-center gap-3 text-[14px]">
            <a href="/PRIVACY_POLICY.md" target="_blank" rel="noreferrer" className="text-[#76003f] hover:text-[#640035]">Privacy Policy</a>
            <a href="/TERMS_OF_SERVICE.md" target="_blank" rel="noreferrer" className="text-[#76003f] hover:text-[#640035]">Terms of Service</a>
          </div>
        </article>
      </section>
    </main>

    <footer className="border-t border-slate-300 bg-[#1b0a14] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xl font-bold tracking-tight">Velo</p>
          <p className="mt-1 text-sm text-white/70">Project operations for focused teams.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/75">
          <button onClick={onBackToHome} className="hover:text-white">Home</button>
          <button onClick={onOpenPricing} className="hover:text-white">Pricing</button>
          <button onClick={onSignIn} className="hover:text-white">Log in</button>
          <button onClick={onGetStarted} className="hover:text-white">Get started</button>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Velo</p>
          <div className="flex items-center gap-3">
            <a href="/PRIVACY_POLICY.md" target="_blank" rel="noreferrer" className="hover:text-white">Privacy</a>
            <a href="/TERMS_OF_SERVICE.md" target="_blank" rel="noreferrer" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
);

export default SupportPage;
