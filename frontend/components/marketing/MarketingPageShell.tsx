import React from 'react';
import Button from '../ui/Button';

type MarketingNavKey = 'product' | 'solutions' | 'pricing' | 'support' | 'contact';

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
  onOpenSupport: () => void;
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
  onOpenSupport,
  onOpenContact,
  onSignIn,
  onGetStarted,
  children
}) => {
  const navItems: Array<{ key: MarketingNavKey; label: string; onClick: () => void }> = [
    { key: 'product', label: 'Product', onClick: onOpenProduct },
    { key: 'solutions', label: 'Solutions', onClick: onOpenSolutions },
    { key: 'pricing', label: 'Pricing', onClick: onOpenPricing },
    { key: 'support', label: 'Support', onClick: onOpenSupport },
    { key: 'contact', label: 'Contact', onClick: onOpenContact }
  ];

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

      <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-10 md:px-6 md:py-12">
        <section className="grid gap-4 rounded-3xl bg-[#76003f] p-6 text-white md:grid-cols-[1.35fr_0.65fr] md:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/70">{heroEyebrow}</p>
            <h1 className="mt-2 text-[34px] font-semibold leading-[1.02] tracking-tight md:text-[50px]">{heroTitle}</h1>
            <p className="mt-3 max-w-3xl text-[17px] text-white/90 md:text-[20px]">{heroDescription}</p>
          </div>
          <div>
            {heroAside ? heroAside : null}
          </div>
        </section>

        {children}
      </main>
    </div>
  );
};

export default MarketingPageShell;
