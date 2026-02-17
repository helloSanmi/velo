import React from 'react';
import { ArrowLeft, Cloud } from 'lucide-react';
import Button from './ui/Button';

interface PricingPageProps {
  onBackToHome: () => void;
  onOpenSupport: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const plans = [
  ['Free', '$0', 'per user / month', ['Up to 3 licensed users', 'Board, projects, and roadmap', 'Core collaboration']],
  ['Basic', '$5', 'per user / month', ['Unlimited licensed users', 'Analytics, resources, and integrations', 'Saved views and advanced filters']],
  ['Pro', '$7', 'per user / month', ['Everything in Basic', 'Workflow automation', 'AI tools and governance']]
] as const;

const PricingPage: React.FC<PricingPageProps> = ({ onBackToHome, onOpenSupport, onSignIn, onGetStarted }) => (
  <div className="min-h-screen bg-[#efefef] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-300 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-6">
        <button onClick={onBackToHome} className="flex items-center gap-2.5">
          <p className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</p>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBackToHome}><ArrowLeft className="mr-1.5 h-4 w-4" />Home</Button>
          <Button variant="ghost" size="sm" onClick={onOpenSupport}>Support</Button>
          <Button variant="ghost" size="sm" onClick={onSignIn}>Log in</Button>
          <Button size="sm" onClick={onGetStarted} className="rounded-full !bg-black px-5 !text-white hover:!bg-slate-900">Get started</Button>
        </div>
      </div>
    </header>

    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-6 md:py-10">
      <section className="rounded-3xl bg-[#76003f] px-6 py-8 text-white md:px-8 md:py-10">
        <p className="text-xs uppercase tracking-[0.14em] text-white/70">Pricing</p>
        <h1 className="mt-2 text-[36px] font-semibold leading-[0.98] tracking-tight md:text-[52px]">Choose the plan that matches your delivery model</h1>
        <p className="mt-3 max-w-3xl text-[18px] text-white/90 md:text-[22px]">
          Start free, then scale into advanced reporting, automation, and governance when your team needs it.
        </p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map(([name, price, unit, features], index) => (
          <article key={name} className={`rounded-2xl border bg-white p-6 shadow-sm ${index === 1 ? 'border-[#b57494] ring-1 ring-[#d8b9c8]' : 'border-slate-300'}`}>
            <p className="text-[26px] font-semibold tracking-tight text-slate-900">{name}</p>
            <p className="mt-1 text-[38px] font-semibold leading-none text-[#76003f]">{price}</p>
            <p className="text-sm text-slate-500">{unit}</p>
            <Button className={`mt-4 w-full rounded-full ${index === 1 ? '!bg-[#76003f] hover:!bg-[#640035] !text-white' : '!text-slate-900'}`} variant={index === 1 ? 'primary' : 'outline'} onClick={onGetStarted}>
              Choose {name}
            </Button>
            <ul className="mt-4 space-y-2 text-[15px] text-slate-700">
              {features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-2xl bg-[#f0dce3] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight text-[#76003f]">Need help choosing?</h2>
            <p className="mt-1 text-[17px] text-[#76003f]/85">Talk to support to map your team structure and rollout plan.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onOpenSupport} className="border-[#76003f]/35 !text-[#76003f] hover:bg-[#f6ecf1]">Talk to support</Button>
            <Button onClick={onGetStarted} className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Start workspace</Button>
          </div>
        </div>
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
          <button onClick={onOpenSupport} className="hover:text-white">Support</button>
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

export default PricingPage;
