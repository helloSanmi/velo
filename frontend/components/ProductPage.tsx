import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from './ui/Button';

interface ProductPageProps {
  onBackToHome: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenSupport: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const sections = [
  ['Board', 'Plan and track tasks with flexible stages, dependencies, and assignees.'],
  ['Roadmap', 'Map delivery horizons with milestone visibility and practical filters.'],
  ['Analytics', 'Monitor delivery health, throughput, risk, and project performance.'],
  ['Resources', 'Balance workload and staffing with simple, actionable insights.'],
  ['Templates', 'Start quickly with proven templates for launches, operations, and delivery.'],
  ['AI Assist', 'Generate tasks, run audits, and speed up planning from one secure AI backend.']
] as const;

const ProductPage: React.FC<ProductPageProps> = ({ onBackToHome, onOpenSolutions, onOpenPricing, onOpenSupport, onSignIn, onGetStarted }) => (
  <div className="min-h-screen bg-[#efefef] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-300 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-6">
        <button onClick={onBackToHome} className="text-3xl font-bold tracking-tight text-[#6f093f]">velo</button>
        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <button className="text-slate-900 font-semibold">Product</button>
          <button onClick={onOpenSolutions} className="hover:text-slate-900">Solutions</button>
          <button onClick={onOpenPricing} className="hover:text-slate-900">Pricing</button>
          <button onClick={onOpenSupport} className="hover:text-slate-900">Support</button>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBackToHome}><ArrowLeft className="mr-1.5 h-4 w-4" />Home</Button>
          <Button variant="ghost" size="sm" onClick={onSignIn}>Log in</Button>
          <Button size="sm" onClick={onGetStarted} className="rounded-full !bg-black px-5 !text-white hover:!bg-slate-900">Get started</Button>
        </div>
      </div>
    </header>

    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-6 md:py-10">
      <section className="rounded-3xl bg-[#76003f] px-6 py-8 text-white md:px-8 md:py-10">
        <p className="text-xs uppercase tracking-[0.14em] text-white/70">Product</p>
        <h1 className="mt-2 text-[36px] font-semibold leading-[0.98] tracking-tight md:text-[52px]">One workspace for planning, execution, and reporting</h1>
        <p className="mt-3 max-w-3xl text-[18px] text-white/90 md:text-[22px]">
          Velo brings projects, teams, and AI workflows together without overwhelming your process.
        </p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map(([title, text]) => (
          <article key={title} className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <p className="text-[24px] font-semibold tracking-tight text-slate-900">{title}</p>
            <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{text}</p>
          </article>
        ))}
      </section>
    </main>
  </div>
);

export default ProductPage;
