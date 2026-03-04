import { InvitePreview, AuthMode, PlanOption, Tier } from './AuthView.types';

export interface AuthViewFormProps {
  mode: AuthMode;
  handleSubmit: (event: React.FormEvent) => void;
  licenseBlocked: { provider: 'microsoft'; message: string } | null;
  orgName: string;
  setOrgName: (value: string) => void;
  invitePreview: InvitePreview | null;
  inviteToken: string;
  setInviteToken: (value: string) => void;
  identifier: string;
  setIdentifier: (value: string) => void;
  isResetPasswordMode: boolean;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  plans: PlanOption[];
  selectedTier: Tier;
  setSelectedTier: (tier: Tier) => void;
  effectiveSeatCount: number | null;
  selectedPlanLabel: string;
  setSeatCount: (count: number) => void;
  error: string;
  resetNotice: string;
  loading: boolean;
  oauthLoadingProvider: 'microsoft' | null;
  handleProviderSignIn: (provider: 'microsoft') => Promise<void>;
  setIsResetPasswordMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setError: (value: string) => void;
  setResetNotice: (value: string) => void;
}
