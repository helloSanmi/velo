import React from 'react';
import Button from '../ui/Button';

type MarketingNavKey = 'product' | 'solutions' | 'pricing' | 'contact';

interface MarketingPageShellProps {
  activeNav: MarketingNavKey;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroAside?: React.ReactNode;
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenContact: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
  children: React.ReactNode;
}

const MarketingPageShell: React.FC<MarketingPageShellProps> = ({
  activeNav,
  heroEyebrow,
  heroTitle,
  heroDescription,
  heroAside,
  onBackToHome,
  onOpenProduct,
  onOpenSolutions,
  onOpenPricing,
  onOpenContact,
  onSignIn,
  onGetStarted,
  children
}) => {
  const [activeHeroPhrase, setActiveHeroPhrase] = React.useState(0);
  const hasHeroAside = Boolean(heroAside);
  const navItems: Array<{ key: MarketingNavKey; label: string; onClick: () => void }> = [
    { key: 'product', label: 'Product', onClick: onOpenProduct },
    { key: 'solutions', label: 'Solutions', onClick: onOpenSolutions },
    { key: 'pricing', label: 'Pricing', onClick: onOpenPricing },
    { key: 'contact', label: 'Contact', onClick: onOpenContact }
  ];

  const heroTheme = (() => {
    if (activeNav === 'product') {
      return {
        sectionClassName: 'overflow-hidden rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-slate-900 md:p-6',
        eyebrowClassName: 'text-xs uppercase tracking-[0.14em] text-[#76003f]',
        descriptionClassName: 'mt-2.5 max-w-2xl text-[16px] leading-relaxed text-slate-600 md:text-[17px]',
        badge: null,
        badgeClassName: '',
        rotatingPhrases: [],
        meta: []
      };
    }

    if (activeNav === 'solutions') {
      return {
        sectionClassName: 'overflow-hidden rounded-3xl border border-[#eadce2] bg-[#fcf8fa] p-5 text-slate-900 md:p-6',
        eyebrowClassName: 'text-xs uppercase tracking-[0.14em] text-[#76003f]',
        descriptionClassName: 'mt-2.5 max-w-2xl text-[16px] leading-relaxed text-slate-600 md:text-[17px]',
        badge: null,
        badgeClassName: '',
        rotatingPhrases: [],
        meta: []
      };
    }

    return {
        sectionClassName: 'overflow-hidden rounded-3xl bg-[#76003f] p-6 text-white md:grid-cols-[1.35fr_0.65fr] md:p-8',
      eyebrowClassName: 'text-xs uppercase tracking-[0.14em] text-white/70',
      descriptionClassName: 'mt-3 max-w-3xl text-[17px] text-white/90 md:text-[20px]',
      badge: null,
      badgeClassName: '',
      rotatingPhrases: [],
      meta: []
    };
  })();

  React.useEffect(() => {
    setActiveHeroPhrase(0);
  }, [activeNav]);

  const rotatingPhraseKey = heroTheme.rotatingPhrases.join('|');

  React.useEffect(() => {
    if (!heroTheme.rotatingPhrases.length) return;
    const id = window.setInterval(() => {
      setActiveHeroPhrase((current) => (current + 1) % heroTheme.rotatingPhrases.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [rotatingPhraseKey]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center px-5 md:px-6">
          <button onClick={onBackToHome} className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</button>
          <nav className="hidden items-center justify-center gap-6 text-sm text-slate-700 md:flex">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={item.key === activeNav ? undefined : item.onClick}
                className={item.key === activeNav ? 'font-semibold text-slate-900 cursor-default' : 'hover:text-slate-900'}
                aria-current={item.key === activeNav ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSignIn}>Log in</Button>
            <Button size="sm" onClick={onGetStarted} className="rounded-full !bg-[#0f172a] px-5 !text-white hover:!bg-[#020617]">Get started</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-5 px-5 py-8 md:px-6 md:py-10">
        <section className={`relative ${hasHeroAside ? 'grid gap-4 md:grid-cols-[1.35fr_0.65fr]' : ''} ${heroTheme.sectionClassName}`}>
          {hasHeroAside ? (
            <div className="pointer-events-none absolute inset-0 opacity-100">
              <div className="absolute inset-x-0 top-0 h-px bg-white/55" />
              {activeNav === 'product' ? <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-slate-300/60" /> : null}
              {activeNav === 'solutions' ? <div className="absolute right-8 top-8 h-20 w-20 rounded-full border border-[#e6d4db]" /> : null}
            </div>
          ) : null}
          <div className={hasHeroAside ? '' : 'max-w-4xl'}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={heroTheme.eyebrowClassName}>{heroEyebrow}</p>
              {heroTheme.badge ? (
                <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${heroTheme.badgeClassName}`}>
                  {heroTheme.badge}
                </span>
              ) : null}
            </div>
            <h1 className={`mt-2 font-semibold leading-[1.04] tracking-tight ${hasHeroAside ? 'text-[32px] md:text-[46px]' : 'text-[30px] md:text-[42px]'}`}>{heroTitle}</h1>
            <p className={heroTheme.descriptionClassName}>{heroDescription}</p>
            {heroTheme.rotatingPhrases.length ? (
              <div className="relative mt-3 h-8 overflow-hidden">
                {heroTheme.rotatingPhrases.map((phrase, index) => (
                  <p
                    key={phrase}
                    className={`transition-opacity duration-500 ${index === activeHeroPhrase ? 'opacity-100' : 'pointer-events-none absolute opacity-0'}`}
                  >
                    <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700">
                      {phrase}
                    </span>
                  </p>
                ))}
              </div>
            ) : null}
            {heroTheme.meta.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {heroTheme.meta.map((item) => (
                  <span key={item.label} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700">
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {hasHeroAside ? <div className="relative">{heroAside}</div> : null}
        </section>

        {children}
      </main>
    </div>
  );
};

export default MarketingPageShell;
