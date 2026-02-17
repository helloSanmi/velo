import React from 'react';
import Button from './ui/Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenSupport: () => void;
}

const useCaseCards = [
  ['Campaign management', 'Plan, approve, and ship campaigns with clearer handoffs and status.'],
  ['Creative production', 'Coordinate briefs, reviews, and final delivery across teams.'],
  ['Project intake', 'Capture requests, prioritize quickly, and assign ownership with context.'],
  ['Product launches', 'Align product, engineering, marketing, and operations on release readiness.']
];

const footerLinks = ['Product', 'Solutions', 'Pricing', 'Support', 'Privacy', 'Terms'];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onOpenProduct, onOpenSolutions, onOpenPricing, onOpenSupport }) => (
    <div className="min-h-screen bg-[#efefef] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-6">
          <div className="flex items-center gap-6">
            <button className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</button>
            <nav className="hidden items-center gap-6 text-[15px] text-slate-700 md:flex">
              <button onClick={onOpenProduct} className="hover:text-slate-900">Product</button>
              <button onClick={onOpenSolutions} className="hover:text-slate-900">Solutions</button>
              <button onClick={onOpenSupport} className="hover:text-slate-900">Support</button>
              <button onClick={onOpenPricing} className="hover:text-slate-900">Pricing</button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLogin} className="border-slate-400 bg-white text-slate-900 hover:bg-slate-100">Log in</Button>
            <Button size="sm" onClick={onGetStarted} className="rounded-full bg-black px-5 text-white hover:bg-slate-900">Get started</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-[#76003f] px-5 pb-9 pt-9 text-center text-white md:px-6 md:pb-12 md:pt-12">
          <div className="mx-auto max-w-[1120px]">
            <h1 className="mx-auto max-w-[920px] text-[34px] font-semibold leading-[1.02] tracking-tight sm:text-[42px] md:text-[52px] lg:text-[60px]">
              All your project work, all in one place
            </h1>
            <p className="mx-auto mt-4 max-w-[760px] text-[16px] leading-snug text-white/90 md:text-[20px]">
              Bring teams and AI together to plan, execute, and report with less operational noise.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={onGetStarted} className="h-11 rounded-full bg-[#f5e8ec] px-6 !text-[#76003f] hover:bg-[#f7eff2] md:h-12 md:px-8 md:text-[16px]">Get started</Button>
              <Button variant="outline" onClick={onOpenSupport} className="h-11 rounded-full border-white/60 bg-white/5 px-6 !text-white hover:bg-white/15 md:h-12 md:px-8 md:text-[16px]">View demo</Button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/15 bg-white/10 p-4 md:mt-10 md:p-5">
              <div className="rounded-[20px] bg-white p-4 text-left text-slate-900 md:p-5">
                <p className="text-[17px] font-semibold md:text-[20px]">Velo annual planning workspace</p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-3 text-[13px] md:text-[15px]">Goals by status: 35</div>
                  <div className="rounded-lg border border-slate-200 p-3 text-[13px] md:text-[15px]">Stakeholder review due this week</div>
                  <div className="rounded-lg border border-slate-200 p-3 text-[13px] md:text-[15px]">Generate status update with AI</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-5 md:grid-cols-[1.1fr_1.9fr]">
              <p className="text-[24px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">
                85% of Fortune 100 companies choose structured execution platforms
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-[16px] font-semibold text-slate-700 md:grid-cols-5 md:text-[18px]">
                {['Amazon', 'Accenture', 'J&J', 'Dell', 'Merck'].map((logo) => (
                  <div key={logo} className="rounded-lg border border-slate-300 bg-white px-2 py-4">{logo}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-2 md:px-6">
          <div className="mx-auto max-w-7xl rounded-3xl bg-[#efdce3] p-6 md:p-8">
            <div className="max-w-4xl">
              <h2 className="text-[30px] font-semibold leading-[1] tracking-tight text-[#76003f] md:text-[40px]">
                Build your most reliable delivery year
              </h2>
              <p className="mt-3 text-[18px] leading-relaxed text-[#76003f]/90 md:text-[22px]">
                Set measurable goals, standardize project flow, and use AI to keep execution on track.
              </p>
              <Button onClick={onGetStarted} className="mt-6 rounded-full bg-[#76003f] px-7 py-3 text-white hover:bg-[#640035] md:text-[16px]">Get started</Button>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12 pt-10 md:px-6 md:pt-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="max-w-5xl text-[32px] font-semibold leading-[1] tracking-tight text-slate-900 md:text-[44px]">
              See how Velo keeps delivery moving across use cases
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {useCaseCards.map(([title, body]) => (
                <article key={title} className="rounded-2xl border border-slate-300 bg-white p-6">
                  <p className="text-[24px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[28px]">{title}</p>
                  <p className="mt-3 text-[16px] leading-relaxed text-slate-600 md:text-[18px]">{body}</p>
                  <button className="mt-6 text-[16px] font-semibold text-slate-900 hover:text-[#76003f] md:text-[18px]">
                    See {title.toLowerCase()} →
                  </button>
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
            <button onClick={onOpenSupport} className="hover:text-white">Contact</button>
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
