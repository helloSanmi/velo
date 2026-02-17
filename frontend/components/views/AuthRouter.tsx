import React from 'react';
import AuthView from '../AuthView';
import LandingPage from '../LandingPage';
import PricingPage from '../PricingPage';
import SupportPage from '../SupportPage';
import ProductPage from '../ProductPage';
import SolutionsPage from '../SolutionsPage';
import { User } from '../../types';

interface AuthRouterProps {
  authView: 'landing' | 'product' | 'solutions' | 'pricing' | 'support' | 'login' | 'register' | 'join';
  setAuthView: (view: 'landing' | 'product' | 'solutions' | 'pricing' | 'support' | 'login' | 'register' | 'join') => void;
  onAuthSuccess: (user: User | null) => void;
}

const AuthRouter: React.FC<AuthRouterProps> = ({ authView, setAuthView, onAuthSuccess }) => {
  if (authView === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setAuthView('register')}
        onLogin={() => setAuthView('login')}
        onOpenProduct={() => setAuthView('product')}
        onOpenSolutions={() => setAuthView('solutions')}
        onOpenPricing={() => setAuthView('pricing')}
        onOpenSupport={() => setAuthView('support')}
      />
    );
  }

  if (authView === 'product') {
    return (
      <ProductPage
        onBackToHome={() => setAuthView('landing')}
        onOpenSolutions={() => setAuthView('solutions')}
        onOpenPricing={() => setAuthView('pricing')}
        onOpenSupport={() => setAuthView('support')}
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
        onOpenSupport={() => setAuthView('support')}
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
      />
    );
  }

  if (authView === 'pricing') {
    return (
      <PricingPage
        onBackToHome={() => setAuthView('landing')}
        onOpenSupport={() => setAuthView('support')}
        onSignIn={() => setAuthView('login')}
        onGetStarted={() => setAuthView('register')}
      />
    );
  }

  if (authView === 'support') {
    return (
      <SupportPage
        onBackToHome={() => setAuthView('landing')}
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
      onOpenSupport={() => setAuthView('support')}
    />
  );
};

export default AuthRouter;
