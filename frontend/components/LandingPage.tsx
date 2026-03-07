import React, { useEffect, useMemo, useState } from 'react';
import Button from './ui/Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenContact: () => void;
}

const heroSlides = [
  {
    title: 'Work moves faster when ownership is clear',
    body: 'One workspace for planning, execution, and reporting.'
  },
  {
    title: 'Less status noise, more real progress',
    body: 'See what is moving, blocked, or needs a decision.'
  },
  {
    title: 'Reliable delivery without process clutter',
    body: 'Keep teams aligned with boards, approvals, and focused updates.'
  }
] as const;

const capabilityCards = [
  {
    title: 'Boards',
    body: 'Track work by stage with clean handoffs.'
  },
  {
    title: 'Approvals',
    body: 'Control sensitive transitions.'
  },
  {
    title: 'AI Copilot',
    body: 'Get suggestions from live workspace context.'
  },
  {
    title: 'Reporting',
    body: 'See risk, throughput, and progress.'
  }
];

const proofBullets = [
  'Clear ownership on every task',
  'Approval checkpoints before completion',
  'Live status without manual reporting'
];

const showcaseSections = [
  {
    id: 'execution-board',
    eyebrow: 'Execution board',
    title: 'Plan and run work in one live workspace',
    body: 'See stage flow, ownership, workload, and risk without switching tools.',
    bullets: ['Kanban, checklist, table, calendar, and Gantt views', 'Real-time task updates and comments', 'Quick filters for assignees, status, and due state'],
    align: 'left' as const,
    image: '/landing/execution-board.png',
    imageAlt: 'Velo execution board screenshot'
  },
  {
    id: 'governance',
    eyebrow: 'Governance and control',
    title: 'Approve high-impact changes with full context',
    body: 'Use approval checkpoints and activity history to keep decisions controlled and auditable.',
    bullets: ['Completion and reopen approvals', 'Clear activity trail for every major action', 'Controlled transitions for sensitive tasks'],
    align: 'right' as const,
    image: '/landing/governance-approval.png',
    imageAlt: 'Velo task governance and approvals screenshot'
  }
];

const weeklyFlow = [
  {
    step: '01',
    title: 'Plan clearly',
    body: 'Define scope, owners, and due dates in one place.'
  },
  {
    step: '02',
    title: 'Execute daily',
    body: 'Move work forward with live updates, comments, and approvals.'
  },
  {
    step: '03',
    title: 'Report quickly',
    body: 'See progress, risk, and workload without manual status meetings.'
  }
];

const leadershipCards = [
  {
    title: 'Delivery confidence',
    body: 'Track whether the team is likely to finish on time.'
  },
  {
    title: 'Workload balance',
    body: 'Spot who is overloaded and reassign work early.'
  },
  {
    title: 'Approval control',
    body: 'Keep high impact transitions gated and auditable.'
  },
  {
    title: 'Operational speed',
    body: 'Reduce admin work and keep teams focused on delivery.'
  }
];

const faqItems = [
  {
    question: 'Can we start with one team first?',
    answer: 'Yes. Most teams start with one project, then expand after setup is proven.'
  },
  {
    question: 'Can we keep Microsoft sign in and notifications?',
    answer: 'Yes. Velo supports Microsoft SSO and mailbox-based notifications.'
  },
  {
    question: 'Can we control who can approve changes?',
    answer: 'Yes. Approval workflows can be restricted to project owners or workspace admins.'
  }
];

const footerLinks = ['Product', 'Solutions', 'Pricing', 'Privacy', 'Terms'];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onOpenProduct, onOpenSolutions, onOpenPricing, onOpenContact }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = useMemo(() => heroSlides.length, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((previous) => (previous + 1) % slideCount);
    }, 4800);
    return () => window.clearInterval(id);
  }, [slideCount]);

  return (
    <div className="min-h-screen bg-[#efefef] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center px-5 md:px-6">
          <button className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</button>
          <nav className="hidden items-center justify-center gap-6 text-[15px] text-slate-700 md:flex">
            <button onClick={onOpenProduct} className="hover:text-slate-900">Product</button>
            <button onClick={onOpenSolutions} className="hover:text-slate-900">Solutions</button>
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
        <section className="overflow-hidden bg-[#76003f] px-5 text-white md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="landing-slide-shell relative min-h-[420px] pb-14 pt-24 md:min-h-[470px] md:pb-16 md:pt-28">
              <div className="relative mx-auto max-w-4xl">
                {heroSlides.map((slide, index) => (
                  <article
                    key={slide.title}
                    className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${index === activeSlide ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  >
                    <div className="text-center">
                      <h1 className="text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[44px] md:text-[58px]">
                        {slide.title}
                      </h1>
                      <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-white/90 md:text-[20px]">
                        {slide.body}
                      </p>
                    </div>
                  </article>
                ))}
                <div className="invisible">
                  <h1 className="text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[44px] md:text-[58px]">
                    {heroSlides[0].title}
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-white/90 md:text-[20px]">
                    {heroSlides[0].body}
                  </p>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 md:bottom-8">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-1.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-white/95' : 'w-4 bg-white/35 hover:bg-white/55'}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#76003f]">Why teams switch</p>
                <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">Built for teams that run real delivery</h2>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
                  Velo keeps planning, approvals, and reporting in one workspace.
                </p>
                <ul className="mt-4 space-y-2.5 text-[15px] text-slate-700">
                  {proofBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <div className="grid gap-3 sm:grid-cols-2">
                {capabilityCards.map((card, index) => (
                  <article
                    key={card.title}
                    className="landing-reveal rounded-xl border border-slate-200 bg-white p-3.5"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <p className="text-[16px] font-semibold text-slate-900">{card.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{card.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#efefef] px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl space-y-5 md:space-y-7">
            {showcaseSections.map((section) => (
              <article key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
                <div className={`grid gap-5 lg:items-center ${section.align === 'right' ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'lg:grid-cols-[0.95fr_1.05fr]'}`}>
                  <div className={section.align === 'right' ? 'lg:order-2' : ''}>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#76003f]">{section.eyebrow}</p>
                    <h3 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">{section.title}</h3>
                    <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-slate-600 md:text-[16px]">{section.body}</p>
                    <ul className="mt-4 flex flex-wrap gap-2 text-[12px] text-slate-700">
                      {section.bullets.map((item) => (
                        <li key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={section.align === 'right' ? 'lg:order-1' : ''}>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4">
                      <img
                        src={section.image}
                        alt={section.imageAlt}
                        className="h-auto w-full rounded-xl border border-slate-200 bg-white object-cover shadow-sm"
                        loading="lazy"
                        onError={(event) => {
                          const img = event.currentTarget as HTMLImageElement;
                          if (section.imageFallback && img.src !== section.imageFallback) {
                            img.src = section.imageFallback;
                            return;
                          }
                          img.style.display = 'none';
                          const fallback = img.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                      <div className="hidden rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-center">
                        <p className="text-sm font-medium text-slate-700">Add screenshot</p>
                        <p className="mt-1 text-xs text-slate-500">{section.image}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#76003f]">Weekly flow</p>
              <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[36px]">
                A simple rhythm teams can run every week
              </h2>
              <p className="mt-2.5 text-[15px] text-slate-600 md:text-[16px]">
                Keep planning, execution, and reporting in one connected workflow.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:mt-6 md:grid-cols-3">
              {weeklyFlow.map((item) => (
                <article key={item.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  <p className="text-sm font-semibold tracking-[0.08em] text-[#76003f]">{item.step}</p>
                  <h3 className="mt-1.5 text-[22px] font-semibold tracking-tight text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#efefef] px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#76003f]">Leadership view</p>
              <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[36px]">
                Clear signals for delivery decisions
              </h2>
              <p className="mt-2.5 text-[15px] text-slate-600 md:text-[16px]">
                Give teams and leaders one shared delivery view.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:mt-6 md:grid-cols-2">
              {leadershipCards.map((card) => (
                <article key={card.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-[18px] font-semibold tracking-tight text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-9 md:px-6 md:py-10">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#76003f]">Common questions</p>
              <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[34px]">
                Built for practical rollout in real teams
              </h2>
              <div className="mt-4 space-y-2.5">
                {faqItems.map((item) => (
                  <div key={item.question} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <h3 className="text-[16px] font-semibold text-slate-900">{item.question}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-[#f7f2f4] p-6 md:p-7">
              <h3 className="text-[24px] font-semibold leading-tight tracking-tight text-[#76003f]">
                Need a guided rollout path?
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-slate-700">
                We can help define setup, approvals, and onboarding.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#76003f]/20 bg-white px-3 py-1 text-sm text-[#76003f]">Workspace setup</span>
                <span className="rounded-full border border-[#76003f]/20 bg-white px-3 py-1 text-sm text-[#76003f]">Role model</span>
                <span className="rounded-full border border-[#76003f]/20 bg-white px-3 py-1 text-sm text-[#76003f]">Notification model</span>
              </div>
              <div className="mt-5">
                <Button onClick={onOpenContact} className="rounded-full !bg-[#76003f] px-7 py-3 !text-white hover:!bg-[#640035]">
                  Contact sales
                </Button>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 md:mt-6 md:p-4">
                <img
                  src="/landing/rollout-plan.svg"
                  alt="Illustration of rollout plan"
                  className="h-auto w-full rounded-xl"
                  loading="lazy"
                />
              </div>
            </article>
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
      <style>
        {`
          .landing-reveal {
            animation: landingReveal 550ms ease both;
          }

          .landing-slide-shell {
            animation: landingReveal 500ms ease both;
          }

          .landing-slide-track article {
            backface-visibility: hidden;
          }

          @keyframes landingReveal {
            from {
              opacity: 0;
              transform: translate3d(0, 8px, 0);
            }
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default LandingPage;
