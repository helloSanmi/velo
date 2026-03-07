import React from 'react';
import AuthView from '../AuthView';
import LandingPage from '../LandingPage';
import PricingPage from '../PricingPage';
import ProductPage from '../ProductPage';
import SolutionsPage from '../SolutionsPage';
import ContactPage from '../ContactPage';
import { User } from '../../types';
import { getMainSiteUrlFromHost, isWorkspaceSubdomainHost } from '../../utils/workspaceHost';

interface AuthRouterProps {
  authView: 'landing' | 'product' | 'solutions' | 'pricing' | 'contact' | 'login' | 'register' | 'join';
  setAuthView: (view: 'landing' | 'product' | 'solutions' | 'pricing' | 'contact' | 'login' | 'register' | 'join') => void;
  onChoosePlan: (plan: 'free' | 'basic' | 'pro') => void;
  onAuthSuccess: (user: User | null) => void;
}

const AuthRouter: React.FC<AuthRouterProps> = ({ authView, setAuthView, onChoosePlan, onAuthSuccess }) => {
  const workspaceScoped = isWorkspaceSubdomainHost();

  if (workspaceScoped) {
    return (
      <AuthView
        onAuthSuccess={onAuthSuccess}
        initialMode="login"
        workspaceScoped
        onBackToHome={() => window.location.assign(getMainSiteUrlFromHost())}
        onOpenPricing={() => setAuthView('pricing')}
      />
    );
  }

  if (authView === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setAuthView('register')}
        onLogin={() => setAuthView('login')}
        onOpenProduct={() => setAuthView('product')}
        onOpenSolutions={() => setAuthView('solutions')}
        onOpenPricing={() => setAuthView('pricing')}
        onOpenContact={() => setAuthView('contact')}
      />
    );
  }

  if (authView === 'product') {
    return (
      <ProductPage
        onBackToHome={() => setAuthView('landing')}
        onOpenSolutions={() => setAuthView('solutions')}
        onOpenPricing={() => setAuthView('pricing')}
        onOpenContact={() => setAuthView('contact')}
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
      />
    );
  }

  if (authView === 'solutions') {
    return (
      <SolutionsPage
        onBackToHome={() => setAuthView('landing')}
        onOpenProduct={() => setAuthView('product')}
        onOpenPricing={() => setAuthView('pricing')}
        onOpenContact={() => setAuthView('contact')}
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
      />
    );
  }

  if (authView === 'pricing') {
    return (
      <PricingPage
        onBackToHome={() => setAuthView('landing')}
        onOpenProduct={() => setAuthView('product')}
        onOpenSolutions={() => setAuthView('solutions')}
        onOpenContact={() => setAuthView('contact')}
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
        onChoosePlan={onChoosePlan}
      />
    );
  }

  if (authView === 'contact') {
    return (
      <ContactPage
        onBackToHome={() => setAuthView('landing')}
        onOpenProduct={() => setAuthView('product')}
        onOpenSolutions={() => setAuthView('solutions')}
        onOpenPricing={() => setAuthView('pricing')}
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
      />
    );
  }

  return (
    <AuthView
      onAuthSuccess={onAuthSuccess}
      initialMode={authView}
      onBackToHome={() => setAuthView('landing')}
      onOpenPricing={() => setAuthView('pricing')}
    />
  );
};

export default AuthRouter;
