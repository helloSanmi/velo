import React from 'react';
import Button from './ui/Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenSupport: () => void;
  onOpenContact: () => void;
}

const useCaseCards = [
  {
    title: 'Campaign management',
    body: 'Plan timelines, manage approvals, and keep campaign delivery visible end to end.',
    outcomes: ['Clear owners per step', 'Approval checkpoints', 'On-time delivery tracking']
  },
  {
    title: 'Creative production',
    body: 'Run briefs, review cycles, and handoffs in one trackable execution flow.',
    outcomes: ['Shared brief context', 'Review cycle control', 'Handoff accountability']
  },
  {
    title: 'Project intake',
    body: 'Standardize incoming requests, set priority fast, and assign clear ownership.',
    outcomes: ['Consistent intake format', 'Fast triage decisions', 'Owner assignment by rule']
  },
  {
    title: 'Product launches',
    body: 'Coordinate product, engineering, and go-to-market work against one launch plan.',
    outcomes: ['Cross-team dependency view', 'Launch readiness checks', 'Single status source']
  }
];

const footerLinks = ['Product', 'Solutions', 'Pricing', 'Support', 'Privacy', 'Terms'];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onOpenProduct, onOpenSolutions, onOpenPricing, onOpenSupport, onOpenContact }) => (
    <div className="min-h-screen bg-[#efefef] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center px-5 md:px-6">
          <button className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</button>
          <nav className="hidden items-center justify-center gap-6 text-[15px] text-slate-700 md:flex">
            <button onClick={onOpenProduct} className="hover:text-slate-900">Product</button>
            <button onClick={onOpenSolutions} className="hover:text-slate-900">Solutions</button>
            <button onClick={onOpenSupport} className="hover:text-slate-900">Support</button>
            <button onClick={onOpenPricing} className="hover:text-slate-900">Pricing</button>
            <button onClick={onOpenContact} className="hover:text-slate-900">Contact</button>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLogin} className="border-slate-400 bg-white text-slate-900 hover:bg-slate-100">Log in</Button>
            <Button size="sm" onClick={onGetStarted} className="rounded-full bg-black px-5 text-white hover:bg-slate-900">Get started</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-[#76003f] px-5 pb-9 pt-9 text-center text-white md:px-6 md:pb-12 md:pt-12">
          <div className="mx-auto max-w-[1120px]">
            <h1 className="mx-auto max-w-[920px] text-[32px] font-semibold leading-[1.06] tracking-tight sm:text-[40px] md:text-[48px] lg:text-[54px]">
              Run projects with clarity, speed, and control
            </h1>
            <p className="mx-auto mt-4 max-w-[760px] text-[16px] leading-relaxed text-white/90 md:text-[18px]">
              Velo unifies planning, execution, collaboration, and AI guidance so teams deliver reliably at scale.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={onGetStarted}
                className="h-11 rounded-full !bg-white px-7 !text-[#5b0733] shadow-[0_10px_24px_rgba(8,15,44,0.28)] hover:!bg-[#fff3f8] md:h-12 md:px-9 md:text-[16px]"
              >
                Get started
              </Button>
              <Button
                variant="primary"
                onClick={onOpenContact}
                className="h-11 rounded-full !border !border-white/75 !bg-transparent px-7 !text-white shadow-none hover:!bg-white/12 md:h-12 md:px-9 md:text-[16px]"
              >
                Request demo
              </Button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/15 bg-white/10 p-4 md:mt-10 md:p-5">
              <div className="rounded-[20px] bg-white p-4 text-left text-slate-900 md:p-5">
                <p className="text-[16px] font-semibold md:text-[18px]">Velo execution workspace</p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-3 text-[13px] text-slate-700 md:text-[14px]">Live project board with role-based workflow controls</div>
                  <div className="rounded-lg border border-slate-200 p-3 text-[13px] text-slate-700 md:text-[14px]">Completion approvals, audit trail, and lifecycle history</div>
                  <div className="rounded-lg border border-slate-200 p-3 text-[13px] text-slate-700 md:text-[14px]">AI copilots that suggest actions from real project context</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-5 md:grid-cols-[1.1fr_1.9fr]">
              <p className="text-[22px] font-semibold leading-snug tracking-tight text-slate-900 md:text-[28px]">
                Built for teams that need predictable, accountable delivery
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-[15px] font-medium text-slate-700 md:grid-cols-5 md:text-[16px]">
                {['Plan with structure', 'Execute in real time', 'Control access clearly', 'Approve with audit trail', 'Report with AI context'].map((item) => (
                  <div key={item} className="rounded-lg border border-slate-300 bg-white px-2 py-4">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-2 md:px-6">
          <div className="mx-auto max-w-7xl rounded-3xl bg-[#efdce3] p-6 md:p-8">
            <div className="max-w-4xl">
              <h2 className="text-[28px] font-semibold leading-[1.05] tracking-tight text-[#76003f] md:text-[36px]">
                Set a stronger operating rhythm for your teams
              </h2>
              <p className="mt-3 text-[17px] leading-relaxed text-[#76003f]/90 md:text-[20px]">
                Align priorities, enforce workflow standards, and surface delivery risk before it impacts outcomes.
              </p>
              <Button onClick={onGetStarted} className="mt-6 rounded-full bg-[#76003f] px-7 py-3 text-white hover:bg-[#640035] md:text-[16px]">Get started</Button>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12 pt-10 md:px-6 md:pt-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="max-w-5xl text-[30px] font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-[40px]">
              Use Velo across every execution workflow
            </h2>
            <p className="mt-3 max-w-3xl text-[16px] text-slate-600 md:text-[18px]">
              Each workflow combines planning structure, live execution visibility, and measurable outcomes.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {useCaseCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-slate-300 bg-white p-6">
                  <p className="text-[22px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[24px]">{card.title}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600 md:text-[16px]">{card.body}</p>
                  <ul className="mt-4 space-y-2 text-[14px] text-slate-700 md:text-[15px]">
                    {card.outcomes.map((outcome) => (
                      <li key={outcome} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#76003f]" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
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
            {footerLinks.map((link) => {
              if (link === 'Product') return <button key={link} onClick={onOpenProduct} className="hover:text-white">{link}</button>;
              if (link === 'Solutions') return <button key={link} onClick={onOpenSolutions} className="hover:text-white">{link}</button>;
              if (link === 'Pricing') return <button key={link} onClick={onOpenPricing} className="hover:text-white">{link}</button>;
              if (link === 'Support') return <button key={link} onClick={onOpenSupport} className="hover:text-white">{link}</button>;
              return <button key={link} className="hover:text-white">{link}</button>;
            })}
            <button onClick={onOpenContact} className="hover:text-white">Contact</button>
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

export default LandingPage;
