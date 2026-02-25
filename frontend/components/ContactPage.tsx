import React, { useState } from 'react';
import { Building2, CalendarCheck2, Clock3, Mail, MessageSquare, Phone } from 'lucide-react';
import Button from './ui/Button';
import MarketingPageShell from './marketing/MarketingPageShell';

interface ContactPageProps {
  onBackToHome: () => void;
  onOpenProduct: () => void;
  onOpenSolutions: () => void;
  onOpenPricing: () => void;
  onOpenSupport: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const nextSteps = [
  ['Request review', 'We review your goals, team setup, and rollout scope.'],
  ['Tailored walkthrough', 'You get a focused product walkthrough based on your workflow.'],
  ['Rollout plan', 'We share practical next steps for implementation and adoption.']
] as const;

const checklist = [
  'Current workflow stages and approval paths',
  'Team structure and role model',
  'Delivery reporting expectations',
  'Integration and security requirements'
];

const ContactPage: React.FC<ContactPageProps> = (props) => {
  const [sent, setSent] = useState(false);

  return (
    <MarketingPageShell
      activeNav="contact"
      heroEyebrow="Contact us"
      heroTitle="Request a tailored Velo demo"
      heroDescription="Share your delivery goals, and we will show how Velo can support your governance and execution model."
      heroAside={(
        <article className="rounded-2xl border border-white/20 bg-white/10 p-4 md:p-5">
          <p className="text-sm font-medium text-white/80">Direct channels</p>
          <div className="mt-3 space-y-2 text-sm text-white/90">
            <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />hello@velo.app</p>
            <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />+1 (800) 555-0138</p>
            <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />Business-day response target</p>
          </div>
        </article>
      )}
      onBackToHome={props.onBackToHome}
      onOpenProduct={props.onOpenProduct}
      onOpenSolutions={props.onOpenSolutions}
      onOpenPricing={props.onOpenPricing}
      onOpenSupport={props.onOpenSupport}
      onOpenContact={props.onBackToHome}
      onSignIn={props.onSignIn}
      onGetStarted={props.onGetStarted}
    >
      <section className="grid gap-4 lg:grid-cols-[1.15fr_1.25fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
          <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">What to prepare</h2>
          <p className="mt-1.5 text-[14px] text-slate-600">This helps us keep your session relevant and practical.</p>
          <ul className="mt-4 space-y-2 text-[15px] text-slate-700">
            {checklist.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3">{item}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 inline-flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 text-[#76003f]" />
            For enterprise rollout or procurement requests, include team size and target timeline.
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
          <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Tell us about your team</h2>
          {!sent ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input required placeholder="Full name" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none" />
                <input required type="email" placeholder="Work email" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input placeholder="Company" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none" />
                <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none">
                  <option>Team size</option>
                  <option>1-10</option>
                  <option>11-50</option>
                  <option>51-200</option>
                  <option>201+</option>
                </select>
              </div>
              <textarea required placeholder="What do you want to improve in delivery and governance?" className="min-h-[130px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button type="submit" className="!bg-[#76003f] hover:!bg-[#640035] !text-white">Send request</Button>
                <Button type="button" variant="outline" onClick={props.onOpenSupport}>Need support instead</Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 inline-flex items-start gap-2">
              <CalendarCheck2 className="mt-0.5 h-4 w-4" />
              Thanks, your request has been received. Our team will reach out shortly.
            </div>
          )}
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
        <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">What happens next</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nextSteps.map(([step, detail]) => (
            <article key={step} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[17px] font-semibold text-slate-900 inline-flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#76003f]" />{step}</p>
              <p className="mt-1.5 text-[14px] text-slate-600">{detail}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
};

export default ContactPage;
